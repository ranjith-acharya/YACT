<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\JsonResponse;

class AreaController extends Controller
{
    public function index(): JsonResponse
    {
        $areas = Area::orderBy('region')->orderBy('name')->get();

        $grouped = $areas->groupBy('region')->map(function ($group) {
            return $group->map(function ($area) {
                return ['id' => $area->id, 'name' => $area->name];
            })->values();
        });

        return response()->json([
            'areas' => $areas,
            'grouped' => $grouped,
        ]);
    }
}
