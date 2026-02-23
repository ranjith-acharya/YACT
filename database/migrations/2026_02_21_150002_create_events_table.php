<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('event_date');
            // draft     = Event created but not yet visible to members
            // published = Event is live and visible to all community members
            // cancelled = Event was called off, kept for historical reference
            $table->enum('status', ['draft', 'published', 'cancelled'])
                ->default('draft')
                ->index()
                ->comment('draft: not visible | published: live & visible | cancelled: called off, kept for history');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('event_date');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
