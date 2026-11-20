<?php

namespace App\Modules\Assessments\Http\Resources;

use App\Modules\Assessments\Models\StageAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The result of an attempt just submitted: whether it passed, and nothing else (no score or count).
 *
 * @mixin StageAttempt
 */
class AttemptResultResource extends JsonResource
{
    /** @return array{passed: bool} */
    public function toArray(Request $request): array
    {
        return ['passed' => $this->passed];
    }
}
