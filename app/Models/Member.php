<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Member extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'parent_member_id',
        'full_name',
        'surname',
        'father_name',
        'email',
        'phone',
        'address',
        'residence',
        'area_id',
        'native_place',
        'old_membership_no',
        'new_membership_no',
        'photo_path',
        'plain_password',
        'family_members',
        'status',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    protected $hidden = ['plain_password'];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'family_members' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function parentMember()
    {
        return $this->belongsTo(Member::class, 'parent_member_id');
    }

    public function linkedMembers()
    {
        return $this->hasMany(Member::class, 'parent_member_id');
    }
}
