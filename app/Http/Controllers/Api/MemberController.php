<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Member;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::role('Member')->with(['member.linkedMembers.user', 'member.parentMember.user', 'member.area']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('member', function ($mq) use ($search) {
                      $mq->where('full_name', 'like', "%{$search}%")
                        ->orWhere('surname', 'like', "%{$search}%")
                        ->orWhere('native_place', 'like', "%{$search}%");
                  });
            });
        }

        $members = $query->latest()->paginate($request->get('per_page', 15));

        if ($request->user()->hasRole('Super Admin')) {
            $members->getCollection()->transform(function ($user) {
                if ($user->member) {
                    $user->member->makeVisible('plain_password');
                }
                return $user;
            });
        }

        return response()->json($members);
    }

    public function store(StoreMemberRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['full_name'],
            'email' => $validated['email'] ?? $this->generatePlaceholderEmail($validated['full_name']),
            'password' => Str::random(10),
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
            'created_by' => $request->user()->id,
        ]);
        $user->assignRole('Member');

        $member = Member::create([
            'user_id' => $user->id,
            'full_name' => $validated['full_name'],
            'surname' => $validated['surname'] ?? null,
            'father_name' => $validated['father_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'residence' => $validated['residence'] ?? null,
            'native_place' => $validated['native_place'] ?? null,
            'old_membership_no' => $validated['old_membership_no'] ?? null,
            'new_membership_no' => $validated['new_membership_no'] ?? null,
            'family_members' => $validated['family_members'] ?? null,
            'status' => 'active',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'user' => $user->load(['roles', 'member']),
        ], 201);
    }

    public function show(Request $request, User $member): JsonResponse
    {
        $member->load(['roles', 'member.linkedMembers.user', 'member.parentMember.user', 'member.area']);

        if ($request->user()->hasRole('Super Admin') && $member->member) {
            $member->member->makeVisible('plain_password');
        }

        return response()->json(['user' => $member]);
    }

    public function update(UpdateMemberRequest $request, User $member): JsonResponse
    {
        $validated = $request->validated();

        if (isset($validated['full_name'])) {
            $member->update(['name' => $validated['full_name']]);
        }

        if ($member->member) {
            $memberFields = collect($validated)->only([
                'full_name', 'surname', 'father_name', 'address',
                'residence', 'area_id', 'native_place', 'old_membership_no',
                'new_membership_no', 'family_members',
            ])->toArray();

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('member-photos', 'public');
                $memberFields['photo_path'] = $path;
            }

            $member->member->update($memberFields);
        }

        $freshUser = $member->fresh()->load(['roles', 'member.linkedMembers.user', 'member.parentMember.user', 'member.area']);
        if ($request->user()->hasRole('Super Admin') && $freshUser->member) {
            $freshUser->member->makeVisible('plain_password');
        }

        return response()->json(['user' => $freshUser]);
    }

    public function approve(Request $request, User $member): JsonResponse
    {
        $member->update(['status' => 'active']);

        if ($member->member) {
            $member->member->update([
                'status' => 'active',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);
        }

        return response()->json([
            'user' => $member->fresh()->load(['roles', 'member']),
        ]);
    }

    public function destroy(User $member): JsonResponse
    {
        $member->update(['status' => 'archived']);
        $member->delete();

        return response()->json(['message' => 'Member archived successfully']);
    }

    public function linkParent(Request $request, User $member): JsonResponse
    {
        $request->validate([
            'parent_member_id' => ['required', 'exists:members,id'],
        ]);

        if (!$member->member) {
            return response()->json(['message' => 'This user has no member profile'], 422);
        }

        $parentMember = Member::find($request->parent_member_id);

        if ($parentMember->id === $member->member->id) {
            return response()->json(['message' => 'Cannot link a member to themselves'], 422);
        }

        if ($parentMember->parent_member_id === $member->member->id) {
            return response()->json(['message' => 'Circular link detected — this member is already a child of the target'], 422);
        }

        $member->member->update(['parent_member_id' => $parentMember->id]);

        return response()->json([
            'user' => $member->fresh()->load(['roles', 'member.linkedMembers.user', 'member.parentMember.user']),
        ]);
    }

    public function unlinkParent(Request $request, User $member): JsonResponse
    {
        if (!$member->member) {
            return response()->json(['message' => 'This user has no member profile'], 422);
        }

        $member->member->update(['parent_member_id' => null]);

        return response()->json([
            'user' => $member->fresh()->load(['roles', 'member.linkedMembers.user', 'member.parentMember.user']),
        ]);
    }

    private function generatePlaceholderEmail(string $name): string
    {
        $slug = Str::slug($name, '.');
        return $slug . '.' . Str::random(4) . '@alakkal.local';
    }
}
