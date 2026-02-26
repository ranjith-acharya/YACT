<?php

namespace App\Exports;

use App\Models\Area;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;

class MemberRequestTemplateExport implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new class implements FromArray, WithTitle {
                public function array(): array
                {
                    return [
                        ['Full Name', 'Surname', 'Father Name', 'Email', 'Phone', 'Residence', 'Area', 'Native Place', 'Old Membership No', 'New Membership No'],
                        ['JOHN', 'DOE', 'ROBERT', 'john.doe@example.com', '9876543210', 'Mumbai', 'Bhandup West', 'Palakkad', '', ''],
                    ];
                }

                public function title(): string
                {
                    return 'Members';
                }
            },
            new class implements FromArray, WithTitle {
                public function array(): array
                {
                    $areas = Area::orderBy('region')->orderBy('name')->get(['name', 'region']);
                    $rows = [['Area Name', 'Region']];
                    foreach ($areas as $a) {
                        $rows[] = [$a->name, $a->region];
                    }
                    if (count($rows) === 1) {
                        $rows[] = ['Bhandup West', 'Mumbai - Eastern Suburbs'];
                    }
                    return $rows;
                }

                public function title(): string
                {
                    return 'Areas';
                }
            },
            new class implements FromArray, WithTitle {
                public function array(): array
                {
                    $relations = [
                        'Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister',
                        'Grandson', 'Granddaughter', 'Grandfather', 'Grandmother',
                        'Valiyachan', 'Chittappan', 'Ammayi (Paternal)', 'Ammavan', 'Valiyamma', 'Kunjamma',
                        'Father-in-law', 'Mother-in-law', 'Son-in-law', 'Daughter-in-law', 'Brother-in-law', 'Sister-in-law',
                        'Nephew', 'Niece', 'Cousin', 'Other',
                    ];
                    return [['Relation'], ...array_map(fn ($r) => [$r], $relations)];
                }

                public function title(): string
                {
                    return 'Relations';
                }
            },
        ];
    }
}
