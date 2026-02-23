<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view dashboard',
            'manage users',
            'manage members',
            'manage events',
            'manage roles',
            'approve members',
            'submit member requests',
            'view members',
            'view events',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->syncPermissions(Permission::all());

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->syncPermissions([
            'view dashboard', 'manage users', 'manage members',
            'manage events', 'manage roles', 'approve members',
            'submit member requests', 'view members', 'view events',
        ]);

        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $manager->syncPermissions([
            'view dashboard', 'manage members', 'manage events',
            'approve members', 'submit member requests', 'view members', 'view events',
        ]);

        $subManager = Role::firstOrCreate(['name' => 'Sub-Manager']);
        $subManager->syncPermissions([
            'view dashboard', 'submit member requests', 'view members', 'view events',
        ]);

        $member = Role::firstOrCreate(['name' => 'Member']);
        $member->syncPermissions(['view dashboard', 'view members', 'view events']);

        // Enforce single Super Admin
        $existingSuperAdmin = User::role('Super Admin')->first();
        if (!$existingSuperAdmin) {
            $superAdminUser = User::firstOrCreate(
                ['email' => 'superadmin@alakkal.com'],
                [
                    'name' => 'Super Admin',
                    'password' => bcrypt('password'),
                    'status' => 'active',
                ]
            );
            $superAdminUser->assignRole('Super Admin');
        }
    }
}
