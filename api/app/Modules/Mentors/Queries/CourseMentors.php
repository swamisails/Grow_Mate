<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Accounts\Queries\UserNames;
use App\Modules\Courses\Queries\PublishedCourse;
use App\Modules\Mentors\Models\MentorRoute;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * A published Course's Mentors list (R6) for one Employee: every Mentor except the viewer, by name
 * then id. Carries no route (AD-8).
 */
class CourseMentors
{
    public function __construct(
        private readonly PublishedCourse $publishedCourse,
        private readonly UserNames $userNames,
    ) {}

    /**
     * @return list<array{id: int, name: string}>
     *
     * @throws NotFoundHttpException when there is no published Course with this id
     */
    public function handle(int $courseId, int $viewerId): array
    {
        // A draft and a missing Course give the same 404 (Courses owns that rule).
        $this->publishedCourse->handle($courseId);

        /** @var list<int> $mentorIds */
        $mentorIds = MentorRoute::query()
            ->where('course_id', $courseId)
            ->where('user_id', '!=', $viewerId)
            ->pluck('user_id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $mentors = [];
        foreach ($this->userNames->handle($mentorIds) as $id => $name) {
            $mentors[] = ['id' => (int) $id, 'name' => $name];
        }

        // Sorted here, not in SQL, so the order is the same on every database collation.
        usort($mentors, fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']) ?: $a['id'] <=> $b['id']);

        return $mentors;
    }
}
