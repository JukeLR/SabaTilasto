import { sql, type User } from './db';
import bcrypt from 'bcryptjs';

export async function createUser(
	username: string, 
	email: string, 
	password: string,
	firstName?: string,
	lastName?: string
): Promise<User> {
	try {
		const passwordHash = await bcrypt.hash(password, 10);
		
		console.log('Attempting to create user:', { username, email, firstName, lastName });
		
		const result = await sql`
			INSERT INTO users (username, email, password, first_name, last_name, role)
			VALUES (${username}, ${email}, ${passwordHash}, ${firstName || null}, ${lastName || null}, 'pelaaja')
			RETURNING *
		`;
		
		console.log('User created successfully:', result[0]?.id);
		return result[0] as User;
	} catch (error) {
		console.error('Error in createUser:', error);
		throw error;
	}
}

export async function getUserByUsername(username: string): Promise<User | null> {
	const result = await sql`
		SELECT * FROM users WHERE username = ${username}
	`;
	
	return result[0] as User || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const result = await sql`
		SELECT * FROM users WHERE email = ${email}
	`;
	
	return result[0] as User || null;
}

export async function getUserById(id: number): Promise<User | null> {
	const result = await sql`
		SELECT * FROM users WHERE id = ${id}
	`;
	
	return result[0] as User || null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}
