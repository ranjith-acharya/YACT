<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:2']]);

        $q = $request->q;

        $users = User::where('name', 'like', "%{$q}%")
            ->orWhere('email', 'like', "%{$q}%")
            ->limit(5)->get(['id', 'name', 'email']);

        $members = User::role('Member')
            ->with(['member:id,user_id,full_name,surname,area_id,photo_path', 'member.area:id,name,region'])
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhereHas('member', function ($mq) use ($q) {
                        $mq->where('full_name', 'like', "%{$q}%")
                           ->orWhere('surname', 'like', "%{$q}%")
                           ->orWhereHas('area', function ($aq) use ($q) {
                               $aq->where('name', 'like', "%{$q}%");
                           });
                    });
            })
            ->limit(5)->get(['id', 'name', 'email', 'status']);

        $events = Event::where('title', 'like', "%{$q}%")
            ->orWhere('location', 'like', "%{$q}%")
            ->limit(5)->get(['id', 'title', 'event_date', 'location']);

        $posts = Post::with('user:id,name')
            ->where('body', 'like', "%{$q}%")
            ->limit(5)->get(['id', 'body', 'user_id', 'created_at']);

        return response()->json([
            'users' => $users,
            'members' => $members,
            'events' => $events,
            'posts' => $posts,
        ]);
    }
}
