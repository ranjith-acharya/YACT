<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['roles', 'member.linkedMembers.user', 'member.parentMember.user', 'member.area']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->role));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate($request->get('per_page', 15));

        if ($request->user()->hasRole('Super Admin')) {
            $users->getCollection()->transform(function ($user) {
                if ($user->member) {
                    $user->member->makeVisible('plain_password');
                }
                return $user;
            });
        }

        return response()->json($users);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $user->load(['roles', 'member.linkedMembers.user', 'member.parentMember.user', 'member.area']);

        if ($request->user()->hasRole('Super Admin') && $user->member) {
            $user->member->makeVisible('plain_password');
        }

        return response()->json(['user' => $user]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:active,blocked,archived'],
        ]);

        if ($user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Cannot modify Super Admin status'], 403);
        }

        $user->update(['status' => $request->status]);

        return response()->json(['user' => $user->fresh()->load('roles')]);
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        if ($request->role === 'Super Admin') {
            return response()->json(['message' => 'Cannot assign Super Admin role'], 403);
        }

        if ($user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Cannot modify Super Admin roles'], 403);
        }

        $user->syncRoles([$request->role]);

        return response()->json(['user' => $user->fresh()->load('roles')]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Cannot delete Super Admin'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User archived successfully']);
    }
}
