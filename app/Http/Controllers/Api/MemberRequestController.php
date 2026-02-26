<?php

namespace App\Http\Controllers\Api;

use App\Exports\MemberRequestTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\BulkImportMemberRequestsRequest;
use App\Http\Requests\StoreMemberRequestRequest;
use App\Models\Area;
use App\Models\Member;
use App\Models\MemberRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;

class MemberRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MemberRequest::with(['submitter', 'reviewer']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json($requests);
    }

    public function downloadTemplate(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        return Excel::download(
            new MemberRequestTemplateExport(),
            'member-requests-template.xlsx',
            \Maatwebsite\Excel\Excel::XLSX
        );
    }

    public function bulkImport(BulkImportMemberRequestsRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $created = 0;
        $errors = [];

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
        } catch (\Throwable $e) {
            Log::warning('Bulk import: failed to load Excel', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Invalid or corrupted Excel file.',
                'created' => 0,
                'failed' => 0,
                'errors' => [],
            ], 422);
        }

        $sheetNames = [];
        foreach ($spreadsheet->getAllSheets() as $idx => $s) {
            $sheetNames[$idx] = $s->getTitle();
        }
        Log::info('Bulk import: workbook sheets', ['names' => $sheetNames, 'count' => count($sheetNames)]);

        $membersSheet = $spreadsheet->getSheetByName('Members');
        if ($membersSheet === null) {
            $membersSheet = $spreadsheet->getSheet(0);
            Log::info('Bulk import: no sheet named "Members", using first sheet', ['first_sheet_title' => $membersSheet ? $membersSheet->getTitle() : null]);
        } else {
            Log::info('Bulk import: using sheet named "Members"');
        }

        if ($membersSheet === null) {
            return response()->json([
                'message' => 'The workbook has no sheets. Use the downloaded template.',
                'created' => 0,
                'failed' => 0,
                'errors' => [],
            ], 422);
        }

        $membersRows = $membersSheet->toArray();
        $totalRows = count($membersRows);
        $firstRowsRaw = array_slice($membersRows, 0, 3);
        Log::info('Bulk import: sheet data', [
            'sheet_title' => $membersSheet->getTitle(),
            'total_rows' => $totalRows,
            'first_3_rows_raw' => $firstRowsRaw,
            'first_row_cell_types' => isset($membersRows[0]) ? array_map(function ($c) {
                return gettype($c) . (is_object($c) ? '(' . get_class($c) . ')' : '');
            }, $membersRows[0]) : [],
        ]);

        $headerRowIndex = $this->findHeaderRow($membersRows);
        Log::info('Bulk import: header row detection', ['header_row_index' => $headerRowIndex]);

        if ($headerRowIndex === null) {
            Log::warning('Bulk import: no header row found with "Full Name" in first 5 rows');
            return response()->json([
                'message' => 'The first sheet must have a "Full Name" column in the first row. Do not add blank rows above the headers.',
                'created' => 0,
                'failed' => 0,
                'errors' => [],
            ], 422);
        }

        $header = $this->normalizeHeaderRow($membersRows[$headerRowIndex]);
        Log::info('Bulk import: normalized header', ['header_row_index' => $headerRowIndex, 'normalized_header' => $header]);

        $memberColMap = $this->memberColumnMap($header);
        Log::info('Bulk import: column map', ['member_col_map' => $memberColMap, 'has_full_name' => array_key_exists('full_name', $memberColMap)]);

        if (!array_key_exists('full_name', $memberColMap)) {
            Log::warning('Bulk import: header row has no "Full Name" column', ['normalized_header' => $header, 'member_col_map' => $memberColMap]);
            return response()->json([
                'message' => 'The first sheet must have a "Full Name" column in the header row. Use the downloaded template.',
                'created' => 0,
                'failed' => 0,
                'errors' => [],
            ], 422);
        }

        $areaNameToId = Area::pluck('id', 'name')->toArray();
        $dataStartIndex = $headerRowIndex + 1;

        try {
            for ($i = $dataStartIndex; $i < count($membersRows); $i++) {
                $row = $membersRows[$i];
                $rowNum = $i + 1;
                $memberData = $this->rowToMemberData($row, $memberColMap, $areaNameToId);

                if (empty(trim($memberData['full_name'] ?? ''))) {
                    continue;
                }

                $validator = \Illuminate\Support\Facades\Validator::make(
                    ['member_data' => $memberData],
                    (new StoreMemberRequestRequest())->rules()
                );

                if ($validator->fails()) {
                    $errors[] = [
                        'row' => $rowNum,
                        'name' => $memberData['full_name'] ?? '—',
                        'email' => $memberData['email'] ?? null,
                        'phone' => $memberData['phone'] ?? null,
                        'message' => implode(' ', $validator->errors()->all()),
                    ];
                    continue;
                }

                $email = !empty($memberData['email']) ? strtolower(trim($memberData['email'])) : null;
                if ($email) {
                    $existingPending = MemberRequest::where('status', 'pending')
                        ->whereRaw("LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(member_data, '$.email')))) = ?", [$email])
                        ->exists();
                    if ($existingPending) {
                        $errors[] = [
                            'row' => $rowNum,
                            'name' => $memberData['full_name'] ?? '—',
                            'email' => $memberData['email'] ?? null,
                            'phone' => $memberData['phone'] ?? null,
                            'message' => 'Duplicate: a pending request with this email already exists.',
                        ];
                        continue;
                    }
                }

                try {
                    MemberRequest::create([
                        'submitted_by' => $request->user()->id,
                        'member_data' => $memberData,
                        'status' => 'pending',
                    ]);
                    $created++;
                } catch (\Throwable $e) {
                    Log::warning('Bulk import: create failed for row', ['row' => $rowNum, 'error' => $e->getMessage()]);
                    $errors[] = [
                        'row' => $rowNum,
                        'name' => $memberData['full_name'] ?? '—',
                        'email' => $memberData['email'] ?? null,
                        'phone' => $memberData['phone'] ?? null,
                        'message' => $e->getMessage(),
                    ];
                }
            }

            $payload = [
                'message' => "Import completed. {$created} member request(s) created.",
                'created' => $created,
                'failed' => count($errors),
                'errors' => $errors,
            ];
            Log::info('Bulk import: success', ['created' => $created, 'failed' => count($errors)]);
            return response()->json($payload);
        } catch (\Throwable $e) {
            Log::error('Bulk import: unexpected error after processing', [
                'created' => $created,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => $created > 0
                    ? "Import partially completed. {$created} member request(s) created, but an error occurred."
                    : 'Import failed: ' . $e->getMessage(),
                'created' => $created,
                'failed' => count($errors),
                'errors' => $errors,
            ], $created > 0 ? 200 : 500);
        }
    }

    private function findHeaderRow(array $rows): ?int
    {
        $maxScan = min(5, count($rows));
        for ($r = 0; $r < $maxScan; $r++) {
            $normalized = $this->normalizeHeaderRow($rows[$r] ?? []);
            foreach ($normalized as $cell) {
                $lower = strtolower((string) $cell);
                if ($lower === 'full name' || $lower === 'fullname' || preg_match('/full\s*name/i', $lower)) {
                    return $r;
                }
            }
        }
        return null;
    }

    private function normalizeHeaderRow(array $row): array
    {
        return array_map(function ($cell) {
            if (is_object($cell) && method_exists($cell, 'getPlainText')) {
                $s = $cell->getPlainText();
            } else {
                $s = (string) $cell;
            }
            $s = str_replace(["\u{00A0}", "\xC2\xA0", "\xEF\xBB\xBF"], ' ', $s); // nbsp, BOM
            $s = preg_replace('/[\s\x{200B}\x{200C}\x{200D}\x{FEFF}]+/u', ' ', $s);
            $s = preg_replace('/\s+/', ' ', $s);
            return trim($s);
        }, $row);
    }

    private function memberColumnMap(array $header): array
    {
        $map = [];
        $aliases = [
            'full_name' => ['full name', 'fullname', 'name'],
            'surname' => ['surname'],
            'father_name' => ['father name', 'fathername', 'father'],
            'email' => ['email'],
            'phone' => ['phone', 'contact', 'mobile'],
            'residence' => ['residence', 'residence area'],
            'area' => ['area'],
            'native_place' => ['native place', 'nativeplace', 'native'],
            'old_membership_no' => ['old membership no', 'old membership no.'],
            'new_membership_no' => ['new membership no', 'new membership no.'],
        ];
        foreach ($header as $colIndex => $label) {
            $label = strtolower((string) $label);
            if (preg_match('/full\s*name/', $label) && !isset($map['full_name'])) {
                $map['full_name'] = $colIndex;
            }
            foreach ($aliases as $key => $names) {
                if (in_array($label, $names)) {
                    $map[$key] = $colIndex;
                    break;
                }
            }
        }
        return $map;
    }

    private function rowToMemberData(array $row, array $colMap, array $areaNameToId): array
    {
        $get = function ($key) use ($row, $colMap) {
            $idx = $colMap[$key] ?? null;
            if ($idx === null) return null;
            $v = $row[$idx] ?? null;
            return is_scalar($v) ? trim((string) $v) : null;
        };

        $block = function ($value) {
            if ($value === null || $value === '') return $value;
            return mb_strtoupper($value, 'UTF-8');
        };

        $areaName = $get('area');
        $areaId = null;
        if ($areaName && isset($areaNameToId[$areaName])) {
            $areaId = $areaNameToId[$areaName];
        }

        return [
            'full_name' => $block($get('full_name')) ?: '',
            'surname' => $block($get('surname')),
            'father_name' => $block($get('father_name')),
            'email' => $get('email') ?: null,
            'phone' => $get('phone') ?: null,
            'residence' => $block($get('residence')),
            'area_id' => $areaId,
            'native_place' => $block($get('native_place')),
            'old_membership_no' => $get('old_membership_no'),
            'new_membership_no' => $get('new_membership_no'),
            'family_members' => [],
        ];
    }

    public function store(StoreMemberRequestRequest $request): JsonResponse
    {
        $memberData = $request->member_data;

        if (is_string($memberData)) {
            $memberData = json_decode($memberData, true);
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('member-photos', 'public');
            $memberData['photo_path'] = $path;
        }

        $memberRequest = MemberRequest::create([
            'submitted_by' => $request->user()->id,
            'member_data' => $memberData,
            'status' => 'pending',
        ]);

        return response()->json([
            'member_request' => $memberRequest->fresh()->load('submitter'),
        ], 201);
    }

    public function show(MemberRequest $memberRequest): JsonResponse
    {
        return response()->json([
            'member_request' => $memberRequest->load(['submitter', 'reviewer']),
        ]);
    }

    public function approve(Request $request, MemberRequest $memberRequest): JsonResponse
    {
        if ($memberRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed'], 422);
        }

        $data = $memberRequest->member_data;

        $existingUser = null;
        if (!empty($data['email'])) {
            $existingUser = User::withTrashed()->where('email', $data['email'])->first();
        }

        if ($existingUser && !$existingUser->trashed()) {
            return response()->json([
                'message' => 'A user with this email already exists: ' . $data['email'],
            ], 422);
        }

        $generatedCredentials = null;

        $linkResult = DB::transaction(function () use ($request, $memberRequest, $data, $existingUser, &$generatedCredentials) {
            $memberRequest->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_notes' => $request->input('review_notes'),
            ]);

            if ($existingUser && $existingUser->trashed()) {
                $existingUser->restore();
                $existingUser->update([
                    'name' => $data['full_name'],
                    'phone' => $data['phone'] ?? null,
                    'status' => 'active',
                ]);
                $user = $existingUser;
            } else {
                $defaultPassword = !empty($data['phone'])
                    ? preg_replace('/\D/', '', $data['phone'])
                    : 'alakkal@123';
                $email = $data['email'] ?? $this->generatePlaceholderEmail($data['full_name']);

                $user = User::create([
                    'name' => $data['full_name'],
                    'email' => $email,
                    'password' => $defaultPassword,
                    'phone' => $data['phone'] ?? null,
                    'status' => 'active',
                    'created_by' => $request->user()->id,
                ]);

                $generatedCredentials = [
                    'email' => $email,
                    'password' => $defaultPassword,
                ];
            }

            if (!$user->hasRole('Member')) {
                $user->assignRole('Member');
            }

            $memberFields = [
                'full_name' => $data['full_name'],
                'surname' => $data['surname'] ?? null,
                'father_name' => $data['father_name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'residence' => $data['residence'] ?? null,
                'area_id' => $data['area_id'] ?? null,
                'native_place' => $data['native_place'] ?? null,
                'old_membership_no' => $data['old_membership_no'] ?? null,
                'new_membership_no' => $data['new_membership_no'] ?? null,
                'photo_path' => $data['photo_path'] ?? null,
                'family_members' => $data['family_members'] ?? null,
                'status' => 'active',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'created_by' => $memberRequest->submitted_by,
            ];

            if ($generatedCredentials) {
                $memberFields['plain_password'] = $generatedCredentials['password'];
            }

            $parentMember = null;
            $linkMethod = null;

            $applicantEmail = strtolower(trim($data['email'] ?? ''));
            if ($applicantEmail) {
                $parentMember = Member::whereNotNull('family_members')
                    ->get()
                    ->first(function ($member) use ($applicantEmail) {
                        foreach ($member->family_members ?? [] as $fm) {
                            if (!empty($fm['email']) && strtolower(trim($fm['email'])) === $applicantEmail) {
                                return true;
                            }
                        }
                        return false;
                    });
                if ($parentMember) $linkMethod = 'email';
            }

            if (!$parentMember && !empty($data['father_name'])) {
                $fatherName = mb_strtoupper(trim($data['father_name']), 'UTF-8');
                $parentMember = Member::whereRaw('UPPER(TRIM(full_name)) = ?', [$fatherName])
                    ->where('status', 'active')
                    ->first();
                if ($parentMember) $linkMethod = 'father_name';
            }

            if ($parentMember) {
                $memberFields['parent_member_id'] = $parentMember->id;
            }

            Member::updateOrCreate(['user_id' => $user->id], $memberFields);

            return ['parent' => $parentMember?->load('user'), 'method' => $linkMethod];
        });

        $response = [
            'member_request' => $memberRequest->fresh()->load(['submitter', 'reviewer']),
        ];

        if ($generatedCredentials) {
            $response['credentials'] = $generatedCredentials;
        }

        if ($linkResult && $linkResult['parent']) {
            $p = $linkResult['parent'];
            $response['auto_linked'] = [
                'parent_id' => $p->id,
                'parent_name' => $p->full_name . ($p->surname ? ' ' . $p->surname : ''),
                'method' => $linkResult['method'],
            ];
        }

        return response()->json($response);
    }

    public function reject(Request $request, MemberRequest $memberRequest): JsonResponse
    {
        if ($memberRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed'], 422);
        }

        $request->validate([
            'review_notes' => ['required', 'string', 'min:5'],
        ]);

        $memberRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $request->input('review_notes'),
        ]);

        return response()->json([
            'member_request' => $memberRequest->fresh()->load(['submitter', 'reviewer']),
        ]);
    }

    private function generatePlaceholderEmail(string $name): string
    {
        $slug = Str::slug($name, '.');
        return $slug . '.' . Str::random(4) . '@alakkal.local';
    }
}
