<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::all();

        $counts = DB::table('model_has_roles')
            ->select('role_id', DB::raw('count(*) as users_count'))
            ->groupBy('role_id')
            ->pluck('users_count', 'role_id');

        $roles->each(function ($role) use ($counts) {
            $role->users_count = $counts[$role->id] ?? 0;
        });

        return response()->json(['roles' => $roles]);
    }
}
