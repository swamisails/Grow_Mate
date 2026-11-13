<?php

namespace App\Modules\Courses\Queries;

use App\Modules\Courses\Models\Course;
use DateTimeInterface;

/**
 * The Courses published strictly before an instant, by title then id. Selects only the id and title.
 * Strict, because published times have second precision: a Course published in the same second
 * as the instant may have come after it.
 */
class PublishedBefore
{
    /**
     * @return list<array{id: int, title: string}>
     */
    public function handle(DateTimeInterface $instant): array
    {
        $courses = Course::query()
            ->whereNotNull('published_at')
            ->where('published_at', '<', $instant)
            ->get(['id', 'title'])
            ->map(fn (Course $course): array => ['id' => (int) $course->id, 'title' => $course->title])
            ->all();

        // Sorted here, not in SQL, so the order is the same on every database collation.
        usort($courses, fn (array $a, array $b): int => strcasecmp($a['title'], $b['title']) ?: $a['id'] <=> $b['id']);

        return $courses;
    }
}
