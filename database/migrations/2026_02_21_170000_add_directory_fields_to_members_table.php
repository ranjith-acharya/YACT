<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('father_name')->nullable()->after('full_name');
            $table->string('residence')->nullable()->after('address');
            $table->string('native_place')->nullable()->after('residence');
            $table->string('old_membership_no')->nullable()->after('native_place');
            $table->string('new_membership_no')->nullable()->after('old_membership_no');
            $table->string('photo_path')->nullable()->after('new_membership_no');
            $table->json('family_members')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn([
                'father_name',
                'residence',
                'native_place',
                'old_membership_no',
                'new_membership_no',
                'photo_path',
                'family_members',
            ]);
        });
    }
};
