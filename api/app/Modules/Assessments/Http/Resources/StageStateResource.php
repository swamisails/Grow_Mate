<?php

namespace App\Modules\Assessments\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * One reached Stage on the Course page: its level and `available`, `locked` or `passed`. A Locked
 * Stage also carries `locked_until`, in UTC with `Z`. No score, count or attempts left.
 *
 * @property array{level: string, state: 'available'|'locked'|'passed', locked_until?: Carbon} $resource
 */
class StageStateResource extends JsonResource
{
    /** @return array{level: string, state: 'available'|'locked'|'passed', locked_until?: string} */
    public function toArray(Request $request): array
    {
        $data = ['level' => $this->resource['level'], 'state' => $this->resource['state']];

        if ($this->resource['state'] === 'locked') {
            $data['locked_until'] = $this->resource['locked_until']->copy()->utc()->toIso8601ZuluString();
        }

        return $data;
    }
}
