export function validateRemovalPassword(password: string) {
	if (!password) throw new Error('Enter the PDF password.');
	if (password.length > 127) throw new Error('The password is too long.');
	return password;
}
