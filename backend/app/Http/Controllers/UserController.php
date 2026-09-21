<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        // Optional role filter (e.g. ?role=staff or ?role=admin)
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('search')) {
            $term = '%' . addcslashes($request->search, '%_\\') . '%';
            $query->where(function ($q) use ($term) {
                $driver = $q->getConnection()->getDriverName();
                if ($driver === 'pgsql') {
                    $q->where('name', 'ilike', $term)
                        ->orWhere('email', 'ilike', $term);
                } else {
                    $q->whereRaw('LOWER(name) LIKE LOWER(?)', [$term])
                        ->orWhereRaw('LOWER(email) LIKE LOWER(?)', [$term]);
                }
            });
        }

        $users = $query->orderByRaw("CASE WHEN role = 'admin' THEN 0 ELSE 1 END")
                       ->orderBy('name')
                       ->paginate(15);

        return response()->json([
            'success' => true,
            'data'    => $users->items(),
            'meta'    => [
                'total'        => $users->total(),
                'per_page'     => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'staff_id'     => 'nullable|string|max:20|unique:users,staff_id',
            'name'         => 'required|string|max:50',
            'email'        => 'required|email|unique:users,email',
            'password'     => 'required|string|min:4',
            'role'         => 'nullable|in:admin,staff',
            'position'     => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:20',
            'gender'       => 'nullable|in:Male,Female',
            'start_date'   => 'nullable|date',
            'location_row' => 'nullable|string|max:100',
            'day_off'      => 'nullable|string|max:20',
            'store_name'   => 'nullable|string|max:50',
            'shift'        => 'nullable|in:Morning/Afternoon,Afternoon/Night',
            'avatar'       => 'nullable|image|max:4096',
        ]);

        $nullable = ['staff_id', 'phone_number', 'gender', 'start_date', 'location_row', 'day_off', 'store_name', 'shift', 'position'];
        $optional = [];
        foreach ($nullable as $key) {
            $v = $request->input($key);
            $optional[$key] = ($v === null || $v === '') ? null : $v;
        }

        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        $role = $request->input('role', 'staff');

        try {
            $user = User::create([
                'staff_id'     => $optional['staff_id'],
                'name'         => $request->name,
                'email'        => $request->email,
                'password'     => Hash::make($request->password),
                'role'         => $role,
                'position'     => $optional['position'],
                'phone_number' => $optional['phone_number'],
                'gender'       => $optional['gender'],
                'start_date'   => $optional['start_date'],
                'location_row' => $optional['location_row'],
                'day_off'      => $optional['day_off'],
                'store_name'   => $optional['store_name'],
                'shift'        => $optional['shift'],
                'is_active'    => true,
                'avatar'       => $avatarPath,
            ]);
        } catch (QueryException $e) {
            if ($avatarPath) {
                Storage::disk('public')->delete($avatarPath);
            }
            report($e);

            $sql = $e->getMessage();
            if (str_contains($sql, '23505') || str_contains($sql, 'Duplicate') || str_contains($sql, 'UNIQUE')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This email or staff ID is already registered.',
                    'errors'  => ['email' => ['The email has already been taken.']],
                ], 422);
            }

            $hint = 'Could not create the account.';
            if (str_contains($sql, 'Undefined column') || str_contains($sql, 'does not exist')) {
                $hint .= ' Run database migrations: php artisan migrate';
            }

            return response()->json([
                'success' => false,
                'message' => $hint . (config('app.debug') ? ' ' . $sql : ''),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully.',
            'data'    => $user,
        ], 201);
    }

    public function show(User $user)
    {
        return response()->json([
            'success' => true,
            'data'    => $user,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'staff_id'     => 'nullable|string|max:20|unique:users,staff_id,' . $user->id,
            'name'         => 'sometimes|required|string|max:50',
            'email'        => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password'     => 'nullable|string|min:4',
            'role'         => 'nullable|in:admin,staff',
            'is_active'    => ['sometimes', 'nullable', function ($attribute, $value, $fail) {
                $accepted = [true, false, 1, 0, '1', '0', 'true', 'false', 'on', 'off', 'yes', 'no'];
                if (!in_array($value, $accepted, true) && !in_array(strtolower((string)$value), ['true','false','1','0','on','off','yes','no'])) {
                    $fail('The ' . $attribute . ' field must be a boolean value.');
                }
            }],
            'position'     => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:20',
            'gender'       => 'nullable|in:Male,Female',
            'start_date'   => 'nullable|date',
            'location_row' => 'nullable|string|max:100',
            'day_off'      => 'nullable|string|max:20',
            'store_name'   => 'nullable|string|max:50',
            'shift'        => 'nullable|in:Morning/Afternoon,Afternoon/Night',
            'avatar'       => 'nullable|image|max:4096',
            'remove_avatar'=> 'nullable|string',
        ]);

        $data = $request->only([
            'staff_id', 'name', 'email', 'role', 'is_active', 'position',
            'phone_number', 'gender', 'start_date', 'location_row', 'day_off', 'store_name', 'shift',
        ]);

        foreach (['staff_id', 'phone_number', 'gender', 'start_date', 'location_row', 'day_off', 'store_name', 'shift'] as $nullable) {
            if (array_key_exists($nullable, $data) && $data[$nullable] === '') {
                $data[$nullable] = null;
            }
        }

        if (array_key_exists('is_active', $data)) {
            $v = $data['is_active'];
            $data['is_active'] = filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool)$v;
        }

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } elseif ($request->input('remove_avatar') === '1') {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = null;
        }

        try {
            $user->update($data);
        } catch (QueryException $e) {
            report($e);

            $sql = $e->getMessage();
            if (str_contains($sql, '23505') || str_contains($sql, 'Duplicate') || str_contains($sql, 'UNIQUE')) {
                return response()->json([
                    'success' => false,
                    'message' => 'This email or staff ID is already registered.',
                    'errors'  => ['email' => ['The email has already been taken.']],
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => 'Could not update the account.' . (config('app.debug') ? ' ' . $sql : ''),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully.',
            'data'    => $user->fresh(),
        ]);
    }

    public function destroy(User $user)
    {
        try {
            $user->delete();
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this user. They may have linked records.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }

    public function allStaff()
    {
        $staff = User::where('role', UserRole::STAFF)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'position', 'avatar']);

        return response()->json([
            'success' => true,
            'data'    => $staff,
        ]);
    }
}
