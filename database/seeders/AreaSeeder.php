<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AreaSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            'Mumbai - South' => [
                'Antop Hill', 'Bhuleshwar', 'Byculla East', 'Byculla West', 'Colaba', 'Cumbala Hill',
                'Dadar East', 'Dadar West', 'Fort', 'Girgaon', 'Kalbadevi', 'Kamathipura', 'Malabar Hill', 'Matunga East', 'Matunga West',
                'Parel East', 'Parel West', 'Sion East', 'Sion West', 'Tardeo', 'Umarkhadi'
            ],
            'Mumbai - Western Suburbs' => [
                'Andheri East', 'Andheri West', 'Bandra East', 'Bandra West', 'Borivali East', 'Borivali West', 
                'Dahisar East', 'Dahisar West', 'Goregaon East', 'Goregaon West', 'Jogeshwari East', 'Jogeshwari West',
                'Kandivali East', 'Kandivali West', 'Khar East', 'Khar West', 'Malad East', 'Malad West',
                'Santacruz East', 'Santacruz West', 'Vile Parle East', 'Vile Parle West', 'Juhu East', 'Juhu West',
            ],
            'Mumbai - Eastern Suburbs' => [
                'Bhandup East', 'Bhandup West', 'Ghatkopar East', 'Ghatkopar West', 'Kurla East', 'Kurla West',
                'Mulund East', 'Mulund West', 'Powai', 'Vidyavihar East', 'Vidyavihar West', 'Vikhroli East', 'Vikhroli West',
                'Kanjurmarg East', 'Kanjurmarg West',
            ],
            'Mumbai - Central' => [
                'Chembur East', 'Chembur West', 'Mankhurd North', 'Mankhurd South', 'Mankhurd East', 'Mankhurd West', 'Mankhurd Central', 
                'Govandi East', 'Govandi West', 'Wadala East', 'Wadala West', 'Trombay'
            ],
            'Thane' => [
                'Thane East', 'Thane West', 'Ghodbunder Road', 'Pokhran Road',
                'Majiwada', 'Manpada', 'Wagle Estate', 'Naupada',
                'Kopri', 'Panchpakhadi', 'Vartak Nagar', 'Brahmand',
                'Hiranandani Estate', 'Kasarvadavali', 'Owale', 'Kolshet Road',
                'Balkum', 'Shivai Nagar', 'Kalwa', 'Mumbra',
                'Diva', 'Dombivli East', 'Dombivli West',
                'Kalyan East', 'Kalyan West', 'Ulhasnagar',
                'Ambernath East', 'Ambernath West', 'Badlapur East', 'Badlapur West',
                'Bhiwandi', 'Shahapur',
            ],
            'Navi Mumbai' => [
                'Vashi', 'Nerul', 'Belapur', 'Kharghar', 'Panvel',
                'Airoli', 'Ghansoli', 'Kopar Khairane', 'Turbhe',
                'Sanpada', 'Juinagar', 'Seawoods', 'Ulwe',
                'Kamothe', 'Kalamboli', 'Taloja', 'Dronagiri',
                'Uran', 'Nhava Sheva',
            ],
            'Palghar' => [
                'Vasai East', 'Vasai West', 'Virar East', 'Virar West',
                'Nalasopara East', 'Nalasopara West', 'Palghar', 'Boisar',
                'Mira Road', 'Bhayandar',
            ],
            'Raigad' => [
                'Pen', 'Alibaug', 'Karjat', 'Khopoli', 'Rasayani',
            ],
        ];

        $now = now();
        $rows = [];

        foreach ($areas as $region => $names) {
            foreach ($names as $name) {
                $rows[] = [
                    'name' => $name,
                    'region' => $region,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('areas')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('areas')->insert($chunk);
        }
    }
}
