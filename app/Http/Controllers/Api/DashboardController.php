<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Member;
use App\Models\MemberRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $memberRoleUsers = DB::table('model_has_roles')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->join('users', function ($join) {
                $join->on('model_has_roles.model_id', '=', 'users.id')
                     ->where('model_has_roles.model_type', '=', User::class);
            })
            ->whereNull('users.deleted_at')
            ->where('roles.name', 'Member');

        return response()->json([
            'stats' => [
                'total_users' => User::count(),
                'active_users' => User::where('status', 'active')->count(),
                'total_members' => (clone $memberRoleUsers)->count(),
                'active_members' => (clone $memberRoleUsers)->where('users.status', 'active')->count(),
                'pending_requests' => MemberRequest::where('status', 'pending')->count(),
                'upcoming_events' => Event::where('event_date', '>=', now())->where('status', 'published')->count(),
                'total_events' => Event::count(),
                'total_posts' => Post::count(),
            ],
            'recent_members' => User::role('Member')
                ->with(['member.area', 'member.parentMember'])
                ->where('status', 'active')
                ->latest()
                ->limit(5)
                ->get(),
            'upcoming_events' => Event::where('event_date', '>=', now())
                ->where('status', 'published')
                ->orderBy('event_date')
                ->limit(5)->get(),
            'pending_requests' => MemberRequest::with('submitter')
                ->where('status', 'pending')
                ->latest()
                ->limit(5)->get(),
        ]);
    }
}
