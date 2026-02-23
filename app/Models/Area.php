<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = ['name', 'region'];

    public function members()
    {
        return $this->hasMany(Member::class);
    }
}
