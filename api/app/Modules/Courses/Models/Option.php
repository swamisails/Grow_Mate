<?php

namespace App\Modules\Courses\Models;

use Database\Factories\OptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An answer option of a question. `is_correct` belongs to the authoring read only (AD-14).
 *
 * @property int $id
 * @property int $question_id
 * @property int $position
 * @property string $text
 * @property bool $is_correct
 */
#[Fillable(['position', 'text', 'is_correct'])]
#[UseFactory(OptionFactory::class)]
class Option extends Model
{
    /** @use HasFactory<OptionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_correct' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Question, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
