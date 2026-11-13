import { useEffect, useState } from 'react';
import { createProjectFile } from '../export/project-file';
import { downloadBlob } from '../export/raster';
import type { LogoProject } from '../model/types';
import {
	deleteLocalProject,
	duplicateLocalProject,
	listLocalProjects,
	renameLocalProject,
	type LocalProjectSummary,
} from '../store/local-projects';

interface Props {
	onBack: () => void;
	onOpen: (project: LogoProject) => void;
	onImport: () => void;
}

export default function MyProjects({ onBack, onOpen, onImport }: Props) {
	const [projects, setProjects] = useState<LocalProjectSummary[]>([]);
	const [names, setNames] = useState<Record<string, string>>({});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		try {
			const localProjects = await listLocalProjects();
			setProjects(localProjects);
			setNames(Object.fromEntries(localProjects.map(({ project }) => [project.id, project.name])));
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Saved projects could not be loaded.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh();
	}, []);

	const perform = async (action: () => Promise<void>) => {
		try {
			await action();
			await refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'That project action could not be completed.');
		}
	};
	const exportProject = async (project: LogoProject) => {
		try {
			downloadBlob(await createProjectFile(project), `${project.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'logo-project'}.json`);
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The project file could not be exported.');
		}
	};

	return (
		<section className="logo-projects-screen" aria-labelledby="logo-projects-title">
			<header className="logo-projects-header">
				<div>
					<p className="eyebrow">ON THIS DEVICE</p>
					<h2 id="logo-projects-title">My Projects</h2>
					<p>Your projects are saved in this browser and stay on this device.</p>
				</div>
				<div className="logo-projects-header-actions">
					<button type="button" onClick={onImport}>Import project file</button>
					<button type="button" className="logo-phase-primary" onClick={onBack}>Back to editor</button>
				</div>
			</header>
			{error && <p className="logo-projects-error" role="alert">{error}</p>}
			{loading ? <p role="status">Loading saved projects…</p> : projects.length === 0 ? (
				<div className="logo-projects-empty">
					<p>No saved projects yet. Your work will appear here as you edit.</p>
					<button type="button" onClick={onImport}>Import a project file</button>
				</div>
			) : (
				<ul className="logo-projects-list">
					{projects.map(({ project, thumbnail }) => (
						<li className="logo-project-card" key={project.id}>
							<img src={thumbnail} alt={`${project.name} preview`} />
							<div className="logo-project-card-content">
								<label className="logo-phase-field">
									<span>Project name</span>
									<input
										value={names[project.id] ?? project.name}
										maxLength={200}
										onChange={(event) => setNames((current) => ({ ...current, [project.id]: event.target.value }))}
									/>
								</label>
								<p>Last edited {new Date(project.updatedAt).toLocaleString()}</p>
								<div className="logo-project-card-actions">
									<button type="button" className="logo-phase-primary" onClick={() => onOpen(project)}>Open</button>
									<button type="button" onClick={() => void perform(() => renameLocalProject(project.id, names[project.id] ?? project.name))}>Rename</button>
									<button type="button" onClick={() => void perform(async () => { await duplicateLocalProject(project); })}>Duplicate</button>
									<button type="button" onClick={() => void exportProject(project)}>Export</button>
									<button
										type="button"
										className="logo-project-delete"
										onClick={() => {
											if (window.confirm(`Delete “${project.name}” from this device? This cannot be undone.`)) {
												void perform(() => deleteLocalProject(project.id));
											}
										}}
									>
										Delete
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
