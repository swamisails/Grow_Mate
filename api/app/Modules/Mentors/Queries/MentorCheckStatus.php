<?php

namespace App\Modules\Mentors\Queries;

use App\Modules\Accounts\Queries\UserCreatedAt;
use App\Modules\Courses\Queries\PublishedBefore;
use App\Modules\Mentors\Models\MentorCheck;

/**
 * An Employee's Mentor check status (AD-15): pending until they submit or skip it, and while
 * pending, the Courses they may name (published strictly before their account was created).
 */
class MentorCheckStatus
{
    public function __construct(
        private readonly UserCreatedAt $userCreatedAt,
        private readonly PublishedBefore $publishedBefore,
    ) {}

    /**
     * @return array{pending: bool, courses: list<array{id: int, title: string}>}
     */
    public function handle(int $userId): array
    {
        if (MentorCheck::query()->where('user_id', $userId)->exists()) {
            return ['pending' => false, 'courses' => []];
        }

        return ['pending' => true, 'courses' => $this->eligibleCourses($userId)];
    }

    /**
     * The Courses this user may name in their Mentor check, by title; none when there is no such user.
     *
     * @return list<array{id: int, title: string}>
     */
    public function eligibleCourses(int $userId): array
    {
        $createdAt = $this->userCreatedAt->handle($userId);

        return $createdAt === null ? [] : $this->publishedBefore->handle($createdAt);
    }
}
