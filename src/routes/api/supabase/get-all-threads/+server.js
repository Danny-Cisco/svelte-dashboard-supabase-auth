import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	const { supabase } = locals;
	const archived = url.searchParams.get('archived') === 'true';
	const filters = JSON.parse(url.searchParams.get('filters') || '{}');

	try {
		let query = supabase
			.from('threads')
			.select('*')
			.eq('user_id', locals.user.id)
			.eq('archived', archived);

		Object.entries(filters).forEach(([field, value]) => {
			if (value) {
				if (field === 'tags') {
					const tagsArray = Array.isArray(value) ? value : [value];
					query = query.overlaps(field, tagsArray);
				} else if (value.includes(' OR ')) {
					const orConditions = value.split(' OR ').map((term) => term.trim());
					query = query.or(orConditions.map((term) => `${field}.ilike.%${term}%`).join(','));
				} else {
					query = query.ilike(field, `%${value}%`);
				}
			}
		});

		const { data, error: supaError } = await query;

		if (supaError) {
			console.error('⚠️ Supabase error:', supaError);
			return json({ records: [], error: supaError.message }, { status: 400 });
		}

		if (!data || data.length === 0) {
			console.log('❌ No data found');
			return json({ records: [], error: 'No records found' }, { status: 404 });
		}

		return json({ records: data, error: '' }, { status: 200 });
	} catch (err) {
		console.error('😎 Supabase record fetch error: ', err);
		return json({ records: [], error: 'Failed to fetch records' }, { status: 500 });
	}
}
