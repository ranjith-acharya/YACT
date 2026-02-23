<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->member_data)) {
            $this->merge([
                'member_data' => json_decode($this->member_data, true),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
            'member_data' => ['required', 'array'],
            'member_data.full_name' => ['required', 'string', 'max:255'],
            'member_data.surname' => ['nullable', 'string', 'max:255'],
            'member_data.father_name' => ['nullable', 'string', 'max:255'],
            'member_data.email' => ['nullable', 'email'],
            'member_data.phone' => ['nullable', 'string', 'max:20'],
            'member_data.address' => ['nullable', 'string', 'max:1000'],
            'member_data.residence' => ['nullable', 'string', 'max:500'],
            'member_data.native_place' => ['nullable', 'string', 'max:255'],
            'member_data.old_membership_no' => ['nullable', 'string', 'max:50'],
            'member_data.new_membership_no' => ['nullable', 'string', 'max:50'],
            'member_data.family_members' => ['nullable', 'array'],
            'member_data.family_members.*.name' => ['required_with:member_data.family_members', 'string', 'max:255'],
            'member_data.family_members.*.relation' => ['nullable', 'string', 'max:100'],
            'member_data.family_members.*.age' => ['nullable', 'integer', 'min:0', 'max:150'],
            'member_data.family_members.*.occupation' => ['nullable', 'string', 'max:255'],
            'member_data.family_members.*.qualification' => ['nullable', 'string', 'max:255'],
            'member_data.family_members.*.marital_status' => ['nullable', 'string', 'max:50'],
            'member_data.family_members.*.contact_number' => ['nullable', 'string', 'max:20'],
            'member_data.family_members.*.email' => ['nullable', 'email', 'max:255'],
        ];
    }
}
