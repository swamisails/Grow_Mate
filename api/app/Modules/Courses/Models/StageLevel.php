<?php

namespace App\Modules\Courses\Models;

/**
 * The three Stages of every Course, in the order they are taken.
 */
enum StageLevel: string
{
    case Bronze = 'bronze';
    case Silver = 'silver';
    case Gold = 'gold';

    /**
     * SQL that sorts `stages.level` Bronze, Silver, Gold (works on MySQL and SQLite).
     */
    public static function orderSql(string $column = 'level'): string
    {
        $whens = collect(self::cases())
            ->map(fn (self $level, int $index) => "when '{$level->value}' then {$index}")
            ->implode(' ');

        return "case {$column} {$whens} end";
    }
}
