import { describe, expect, it } from 'vitest';
import { formatSql } from './sql-formatter';

describe('SQL formatter', () => {
	it('formats clauses and uppercase keywords', () => {
		expect(formatSql('select id,name from users where active=1 order by name')).toBe(
			'SELECT id,\n  name\nFROM users\nWHERE active = 1\nORDER BY name',
		);
	});

	it('supports lowercase keywords and preserves identifiers', () => {
		expect(formatSql('SELECT CustomerID, Name FROM Customers WHERE Status = "Active"', 4, 'lower')).toBe(
			'select CustomerID,\n    Name\nfrom Customers\nwhere Status = "Active"',
		);
	});

	it('preserves strings, comments, parameters, and bracketed identifiers', () => {
		expect(formatSql("select 'O''Brien' as Name, [First Name], :id -- keep\nfrom users where id=? /* note */", 2)).toBe(
			"SELECT 'O''Brien' AS Name,\n  [First Name],\n  :id\n-- keep\nFROM users\nWHERE id = ?\n/* note */",
		);
	});

	it('formats joins and subqueries', () => {
		expect(formatSql('select u.id from users u left join orders o on o.user_id=u.id group by u.id')).toBe(
			'SELECT u.id\nFROM users u\nLEFT JOIN orders o\nON o.user_id = u.id\nGROUP BY u.id',
		);
	});

	it('handles DML and semicolon-separated statements', () => {
		expect(formatSql('insert into users(name,status) values (\'Ada\',\'active\'); update users set status=\'away\'')).toBe(
			"INSERT INTO users (name,\n  status)\nVALUES ('Ada',\n  'active');\nUPDATE users\nSET status = 'away'",
		);
	});

	it('reports malformed quotes, comments, and parentheses', () => {
		expect(() => formatSql("select 'unfinished")).toThrow('unclosed string');
		expect(() => formatSql('select * from users /* unfinished')).toThrow('unclosed block comment');
		expect(() => formatSql('select (id from users')).toThrow('unclosed parenthesis');
		expect(() => formatSql('select ) from users')).toThrow('unmatched closing parenthesis');
		expect(() => formatSql('select id', 0)).toThrow('between 1 and 8');
		expect(() => formatSql('select id', 2, 'title')).toThrow('Choose upper');
	});
});
