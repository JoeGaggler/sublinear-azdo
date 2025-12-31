import { Page } from 'azure-devops-ui/Page';
import * as Azdo from '../api/azdo.ts';
// import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import * as Util from '../api/util.ts';
import { Card } from 'azure-devops-ui/Card';

import React from 'react'
import { EditHuddlePanel, type EditHuddlePanelValues } from './EditHuddlePanel.tsx';
import type { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';


function HuddlePage(p: HuddlePageProps) {
    const [huddleInfo, setHuddleInfo] = React.useState<Db.HuddleInfo>(p.huddleInfo)
    const [huddle, setHuddle] = React.useState<Db.HuddleStoredDocument | null>(null)
    const [isEditingHuddle, setIsEditingHuddle] = React.useState<boolean>(false);

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlePage init");

        let huddleInfo = await Db.getHuddleInfo(p.huddleInfo.id, p.sessionInfo);
        if (!huddleInfo) {
            console.log("HuddlePage: failed to load huddle info: ", p.huddleInfo.id)
            return
        }

        setHuddleInfo(huddleInfo)

        let huddle = await Db.getHuddle(huddleInfo, p.database, p.sessionInfo)
        if (!huddle) {
            console.log("HuddlePage: failed to load huddle: ", p.huddleInfo.id)
            return
        }

        setHuddle(huddle)

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

    async function poll() {
        console.log("HuddlePage poll");
    }

    async function onCommitEditHuddle(data: EditHuddlePanelValues) {
        try {
            if (!huddle) { return } // TODO: assert
            
            let nextHuddle: Db.HuddleStoredDocument = { ...huddle }
            nextHuddle.name = data.name
            nextHuddle.workItemQuery = {
                areaPath: data.areaPath
            }
            let saved = await Db.editHuddle(nextHuddle, p.sessionInfo);
            if (!saved) {
                console.error("onCommitEditHuddle: edit failed")
                return
            }

            let newHuddleInfo: Db.HuddleInfo = {
                id: saved.id,
                name: saved.name,
                isDeleted: false,
            }
            setHuddle(saved);
            setHuddleInfo(newHuddleInfo)
        }
        finally {
            setIsEditingHuddle(false);
        }
    }

    async function onCancelEditHuddle() {
        setIsEditingHuddle(false);
    }

    function showEditHuddlePanel() {
        setIsEditingHuddle(true)
    }

    function getHeaderCommandBarItems(): IHeaderCommandBarItem[] {
        let items: IHeaderCommandBarItem[] = []

        let editItem: IHeaderCommandBarItem = {
            id: "editHuddle",
            text: "Edit",
            iconProps: { iconName: "Edit" },
            onActivate: () => { showEditHuddlePanel(); },
            isPrimary: true,
            important: true,
        }
        items.push(editItem)

        return items
    }

    return (
        <Page>
            <Header
                title={huddleInfo.name}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                commandBarItems={getHeaderCommandBarItems()}
            />
            {
                (huddle) && (
                    <div className="page-content page-content-top">
                        <Card>
                            <div className="flex-column">
                                {huddleInfo.id}
                            </div>
                        </Card>
                    </div>
                )
            }
            {
                (huddle && isEditingHuddle) && (
                    <EditHuddlePanel
                        huddle={huddle}
                        onCommit={onCommitEditHuddle}
                        onCancel={onCancelEditHuddle}
                    />
                )
            }
        </Page>
    )
}

export interface HuddlePageProps {
    appNav: AppNav;
    database: Db.Database;
    sessionInfo: Azdo.SessionInfo;
    huddleInfo: Db.HuddleInfo;
}

export default HuddlePage;
