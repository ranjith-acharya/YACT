<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load([
            'roles',
            'member.area',
            'member.linkedMembers.user',
            'member.parentMember.user',
        ]);

        return response()->json(['user' => $user]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->has('family_members') && is_string($request->family_members)) {
            $request->merge(['family_members' => json_decode($request->family_members, true)]);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'current_password' => ['nullable', 'required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'full_name' => ['sometimes', 'string', 'max:255'],
            'surname' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'residence' => ['nullable', 'string', 'max:1000'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'native_place' => ['nullable', 'string', 'max:1000'],
            'old_membership_no' => ['nullable', 'string', 'max:50'],
            'new_membership_no' => ['nullable', 'string', 'max:50'],
            'family_members' => ['nullable', 'array'],
            'photo' => ['nullable', 'image', 'max:2048'],
        ]);

        if (!empty($validated['current_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }
            $user->update(['password' => Hash::make($validated['new_password'])]);
        }

        if (isset($validated['name'])) {
            $user->update(['name' => $validated['name']]);
        }

        if ($user->member) {
            $memberFields = collect($validated)->only([
                'full_name', 'surname', 'father_name', 'address',
                'residence', 'area_id', 'native_place',
                'old_membership_no', 'new_membership_no', 'family_members',
            ])->toArray();

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('member-photos', 'public');
                $memberFields['photo_path'] = $path;
            }

            if (isset($memberFields['full_name'])) {
                $user->update(['name' => $memberFields['full_name']]);
            }

            $user->member->update($memberFields);
        }

        $freshUser = $user->fresh()->load([
            'roles', 'permissions',
            'member.area',
            'member.linkedMembers.user',
            'member.parentMember.user',
        ]);

        return response()->json(['user' => $freshUser]);
    }
}
