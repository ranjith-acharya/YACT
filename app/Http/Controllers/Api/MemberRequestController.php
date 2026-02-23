<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequestRequest;
use App\Models\Member;
use App\Models\MemberRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

        DB::transaction(function () use ($request, $memberRequest, $data, $existingUser, &$generatedCredentials) {
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

                if ($parentMember) {
                    $memberFields['parent_member_id'] = $parentMember->id;
                }
            }

            Member::updateOrCreate(['user_id' => $user->id], $memberFields);
        });

        $response = [
            'member_request' => $memberRequest->fresh()->load(['submitter', 'reviewer']),
        ];

        if ($generatedCredentials) {
            $response['credentials'] = $generatedCredentials;
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
