<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('full_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            // active    = Approved and participating community member
            // inactive  = Newly created, pending approval by Manager/Admin
            // suspended = Membership temporarily revoked by admin action
            $table->enum('status', ['active', 'inactive', 'suspended'])
                ->default('inactive')
                ->index()
                ->comment('active: approved member | inactive: awaiting approval | suspended: membership revoked');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
