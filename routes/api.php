<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\MemberRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PostCommentController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\PostLikeController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', DashboardController::class);
    Route::get('/search', SearchController::class);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);

    Route::get('/members', [MemberController::class, 'index']);
    Route::get('/members/{member}', [MemberController::class, 'show']);

    Route::get('/events', [EventController::class, 'index']);
    Route::get('/events/{event}', [EventController::class, 'show']);

    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/areas', [AreaController::class, 'index']);

    // Posts (community feed)
    Route::get('/posts', [PostController::class, 'index']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::get('/posts/{post}', [PostController::class, 'show']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);
    Route::post('/posts/{post}/like', [PostLikeController::class, 'toggle']);
    Route::post('/posts/{post}/comments', [PostCommentController::class, 'store']);
    Route::delete('/posts/{post}/comments/{comment}', [PostCommentController::class, 'destroy']);
    Route::post('/posts/{post}/comments/{comment}/like', [PostCommentController::class, 'toggleLike']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    // Sub-Manager+ can submit member requests
    Route::middleware('role:Sub-Manager,Manager,Admin,Super Admin')->group(function () {
        Route::post('/member-requests', [MemberRequestController::class, 'store']);
        Route::get('/member-requests', [MemberRequestController::class, 'index']);
        Route::get('/member-requests/template', [MemberRequestController::class, 'downloadTemplate']);
        Route::post('/member-requests/bulk-import', [MemberRequestController::class, 'bulkImport']);
        Route::get('/member-requests/{memberRequest}', [MemberRequestController::class, 'show']);
    });

    // Manager+ can approve/reject requests and manage members
    Route::middleware('role:Manager,Admin,Super Admin')->group(function () {
        Route::post('/member-requests/{memberRequest}/approve', [MemberRequestController::class, 'approve']);
        Route::post('/member-requests/{memberRequest}/reject', [MemberRequestController::class, 'reject']);
        Route::post('/members', [MemberController::class, 'store']);
        Route::put('/members/{member}', [MemberController::class, 'update']);
        Route::post('/members/{member}/approve', [MemberController::class, 'approve']);
        Route::post('/members/{member}/link-parent', [MemberController::class, 'linkParent']);
        Route::delete('/members/{member}/unlink-parent', [MemberController::class, 'unlinkParent']);
        Route::delete('/members/{member}', [MemberController::class, 'destroy']);

        Route::post('/events', [EventController::class, 'store']);
        Route::put('/events/{event}', [EventController::class, 'update']);
        Route::delete('/events/{event}', [EventController::class, 'destroy']);
    });

    // Admin+ can manage users and roles
    Route::middleware('role:Admin,Super Admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::post('/users/{user}/role', [UserController::class, 'assignRole']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });
});
