<?php

namespace Tests\Feature\Courses;

use App\Modules\Accounts\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class CoursesTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Requests come from the SPA on the shared origin (AD-1), so Sanctum treats them as stateful.
        config(['sanctum.stateful' => ['localhost']]);
        $this->withHeader('Referer', 'http://localhost/');
    }

    protected function signedInAdmin(): static
    {
        return $this->actingAs(User::factory()->admin()->create());
    }

    protected function signedInEmployee(): static
    {
        return $this->actingAs(User::factory()->create());
    }

    /**
     * A whole draft document as the editor sends it: three Stages, Bronze to Gold.
     *
     * @param  array<int, array<string, mixed>>  $stages  per-index overrides of the empty Stages
     * @return array<string, mixed>
     */
    protected function document(array $stages = [], string $title = 'SQL Fundamentals', ?string $description = 'Queries and joins.'): array
    {
        $empty = [
            ['level' => 'bronze', 'pass_mark' => null, 'questions' => []],
            ['level' => 'silver', 'pass_mark' => null, 'questions' => []],
            ['level' => 'gold', 'pass_mark' => null, 'questions' => []],
        ];

        foreach ($stages as $index => $stage) {
            $empty[$index] = array_merge($empty[$index], $stage);
        }

        return ['title' => $title, 'description' => $description, 'stages' => $empty];
    }

    /**
     * A question with options; `$correct` is the index of the correct one (null for none).
     *
     * @param  list<string>  $options
     * @return array<string, mixed>
     */
    protected function question(string $text, array $options, ?int $correct = 0): array
    {
        return [
            'text' => $text,
            'options' => array_map(
                fn (string $option, int $index) => ['text' => $option, 'is_correct' => $index === $correct],
                $options,
                array_keys($options),
            ),
        ];
    }
}
