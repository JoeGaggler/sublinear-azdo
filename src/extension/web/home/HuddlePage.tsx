import * as Azdo from '../api/azdo.ts';
// import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';

function HuddlePage(p: HuddlePageProps) {
    return <div>{p.huddle.name}</div>
}

export interface HuddlePageProps {
    appNav: AppNav;
    database: Db.Database;
    sessionInfo: Azdo.SessionInfo;
    huddle: Db.Huddle
}

export default HuddlePage;
