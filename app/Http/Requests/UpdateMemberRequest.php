<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => ['sometimes', 'string', 'max:255'],
            'surname' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'residence' => ['nullable', 'string', 'max:1000'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'native_place' => ['nullable', 'string', 'max:1000'],
            'old_membership_no' => ['nullable', 'string', 'max:50'],
            'new_membership_no' => ['nullable', 'string', 'max:50'],
            'family_members' => ['nullable', 'array'],
            'family_members.*.name' => ['required_with:family_members', 'string', 'max:255'],
            'family_members.*.relation' => ['nullable', 'string', 'max:100'],
            'family_members.*.dob' => ['nullable', 'date', 'before_or_equal:today'],
            'family_members.*.age' => ['nullable', 'integer', 'min:0', 'max:150'],
            'family_members.*.occupation' => ['nullable', 'string', 'max:255'],
            'family_members.*.qualification' => ['nullable', 'string', 'max:255'],
            'family_members.*.marital_status' => ['nullable', 'string', 'max:50'],
            'family_members.*.contact_number' => ['nullable', 'string', 'max:20'],
            'family_members.*.email' => ['nullable', 'email', 'max:255'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ];
    }
}
