<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin credentials can be overridden via environment variables:
        //   ADMIN_STAFF_ID  — the staff ID used to log in  (default: 00001)
        //   ADMIN_PASSWORD  — the initial admin password   (default: password)
        $adminStaffId = env('ADMIN_STAFF_ID', '00001');
        $adminPassword = env('ADMIN_PASSWORD', 'password');

        User::firstOrCreate(
            ['email' => 'admin@jobassign.com'],
            [
                'name'      => 'Admin User',
                'staff_id'  => $adminStaffId,
                'password'  => Hash::make($adminPassword),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        $staffMembers = [
            ['name' => 'Alice Johnson',  'email' => 'staff1@jobassign.com', 'staff_id' => '00002'],
            ['name' => 'Bob Smith',      'email' => 'staff2@jobassign.com', 'staff_id' => '00003'],
            ['name' => 'Carol White',    'email' => 'staff3@jobassign.com', 'staff_id' => '00004'],
            ['name' => 'David Brown',    'email' => 'staff4@jobassign.com', 'staff_id' => '00005'],
            ['name' => 'Eva Martinez',   'email' => 'staff5@jobassign.com', 'staff_id' => '00006'],
        ];

        foreach ($staffMembers as $staff) {
            User::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'name'      => $staff['name'],
                    'staff_id'  => $staff['staff_id'],
                    'password'  => Hash::make('password'),
                    'role'      => 'staff',
                    'is_active' => true,
                ]
            );
        }
    }
}
