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
    const [huddle, setHuddle] = React.useState<Db.HuddleStoredDocument | null>(null)
    const [isEditingHuddle, setIsEditingHuddle] = React.useState<boolean>(false);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let doc = await Azdo.getSharedDocument<Db.HuddleStoredDocument>(
            Db.huddle_collection_id,
            p.id,
            p.sessionInfo);
        if (!doc) {
            console.warn("getHuddle: does not exist")

            // TODO: nav back?
            doc = null
        }
        setHuddle(doc);
    }

    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

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

            let [savedHuddle, _savedHuddles] = await Db.upsertHuddle(nextHuddle, p.sessionInfo)

            setHuddle(savedHuddle);
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

    if (huddle) {
        return (
            <Page>
                <Header
                    title={huddle.name}
                    titleSize={TitleSize.Large}
                    backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                    commandBarItems={getHeaderCommandBarItems()}
                />
                <div className="page-content page-content-top">
                    <Card>
                        <div className="flex-column">
                            {huddle.id}
                        </div>
                    </Card>
                </div>
                {
                    (isEditingHuddle) && (
                        <EditHuddlePanel
                            huddle={huddle}
                            onCommit={onCommitEditHuddle}
                            onCancel={onCancelEditHuddle}
                        />
                    )
                }
            </Page>
        )
    } else {
        return (
            <Page>
                <Header
                    title={""}
                    titleSize={TitleSize.Large}
                    backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                />
            </Page>
        )
    }
}

export interface HuddlePageProps {
    appNav: AppNav;
    database: Db.Database;
    sessionInfo: Azdo.SessionInfo;
    id: string;
}

export default HuddlePage;
