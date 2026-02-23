<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('member_data');
            // pending  = Submitted by Sub-Manager, awaiting review
            // approved = Reviewed and accepted by Manager/Admin, member record created
            // rejected = Reviewed and declined by Manager/Admin with optional notes
            $table->enum('status', ['pending', 'approved', 'rejected'])
                ->default('pending')
                ->index()
                ->comment('pending: awaiting review | approved: accepted & member created | rejected: declined by reviewer');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index('submitted_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_requests');
    }
};
