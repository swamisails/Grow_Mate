<?php

namespace App\Modules\Accounts\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One Employee in Admin's pickers: the id and the account name, nothing else.
 *
 * @property array{id: int, name: string} $resource
 */
class EmployeeResource extends JsonResource
{
    /** @return array{id: int, name: string} */
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource['id'], 'name' => $this->resource['name']];
    }
}
