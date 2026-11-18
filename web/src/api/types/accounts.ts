// Accounts resource types, hand-written to match the API's JsonResources (AD-10).

/** App\Modules\Accounts\Http\Resources\UserResource */
export type User = {
  id: number
  name: string
  email: string
  is_admin: boolean
}

/** App\Modules\Accounts\Http\Resources\EmployeeResource: one Employee in Admin's pickers. */
export type Employee = {
  id: number
  name: string
}

export type SignInRequest = {
  email: string
  password: string
}

export type SignUpRequest = {
  name: string
  email: string
  password: string
}
