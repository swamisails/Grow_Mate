<?php

namespace App\Modules\Assessments\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One reached Stage on the Course page: its level and `available` or `passed`. No score or count.
 *
 * @property array{level: string, state: 'available'|'passed'} $resource
 */
class StageStateResource extends JsonResource
{
    /** @return array{level: string, state: 'available'|'passed'} */
    public function toArray(Request $request): array
    {
        return ['level' => $this->resource['level'], 'state' => $this->resource['state']];
    }
}
