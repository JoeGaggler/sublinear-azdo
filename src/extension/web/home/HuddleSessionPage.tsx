import * as Azdo from '../api/azdo.ts';
import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React from 'react'

// import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
// import { Button } from "azure-devops-ui/Button";
import { SingleLayerMasterPanel } from "azure-devops-ui/MasterDetails";
// import { SingleLayerMasterPanelHeader } from "azure-devops-ui/Components/SingleLayerMasterPanel/SingleLayerMasterPanel";
import { ScrollableList, ListSelection, ListItem, type IListItemDetails, type IListRow } from "azure-devops-ui/List";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Icon, IconSize, type IIconProps } from 'azure-devops-ui/Icon';
import { Pill, PillVariant } from "azure-devops-ui/Pill";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { Card } from "azure-devops-ui/Card";

interface HuddleGraph {
    debugWorkItems: Db.WorkItemSnapshot[]
    slides: HuddleSlide[]
}

interface HuddleSlide {
    type: string
    id: number
    title: string
    fieldChanges: HuddleSlideFieldChange[]
}

interface HuddleSlideFieldChange {
    what: string
    prev: string
    next: string
}

function HuddleSessionPage(p: HuddleSessionPageProps) {
    // let [huddleDoc, setHuddleDoc] = React.useState<Db.HuddleStoredDocument | null>(null)
    let [title, setTitle] = React.useState<string>("")
    let [graph, setGraph] = React.useState<HuddleGraph | undefined>(undefined)
    let [selectedSlide, setSelectedSlide] = React.useState<number | undefined>(undefined)

    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let huddle = await Db.getHuddleDocument(p.huddleId, p.session)
        if (!huddle) {
            // TODO: fail
            console.error("HuddleSessionPage: missing huddle");
            return
        }
        setTitle(`${huddle?.name || ""} Session`)
        console.log("HuddleSessionPage: huddle", huddle);

        let huddleSession = await Db.requireHuddleSessionStoredDocument(p.huddleSessionId, p.session)
        huddleSession.created = huddleSession.created || Util.msecNow()
        console.log("HuddleSessionPage: huddle session", huddleSession);

        let snapShot2 = huddleSession.snapshot

        // TODO: FOR DEBUGGING ONLY, ALWAYS GENERATE A NEW SNAPSHOT!
        snapShot2 = undefined
        // TODO: REMOVE THIS DEBUGGING CODE

        if (!snapShot2) {
            let workItemQuery = huddle.workItemQuery
            if (!workItemQuery) {
                // TODO: fail
                console.error("HuddleSessionPage: missing work item query");
                return
            }

            let created2 = huddleSession.created || Util.msecNow()
            snapShot2 = await getSnapshot(workItemQuery, created2, p.session)
            huddleSession.snapshot = snapShot2
        }

        let snapShot1: Db.HuddleSessionSnapshot;
        if (p.previousHuddleSessionId) {
            let previousHuddleSession = await Db.requireHuddleSessionStoredDocument(p.previousHuddleSessionId, p.session)
            if (!previousHuddleSession.snapshot) {
                snapShot1 = {
                    workitems: {
                        items: []
                    }
                }
            } else {
                snapShot1 = previousHuddleSession.snapshot
            }
        } else {
            snapShot1 = {
                workitems: {
                    items: []
                }
            }
        }

        // TODO: PERSIST ALL CHANGES TO HUDDLE SESSION
        console.log("Snapshot1:", snapShot1)
        console.log("Snapshot2:", snapShot2)

        let workItems1 = snapShot1.workitems?.items || []
        let workItems2 = snapShot2.workitems?.items || []

        let slides: HuddleSlide[] = []
        for (let wi2 of workItems2) {
            // NEW
            let wi1 = workItems1.find(w => w.id === wi2.id)
            if (!wi1) {
                let nextSlide = await createNewSlide(wi2);
                slides.push(nextSlide)
                continue;
            }

            // MATCHED
            let nextSlide = await createFoundSlide(wi1, wi2);
            slides.push(nextSlide)
        }

        // TODO: slides only in previous
        for (let wi1 of workItems1) {
            let wi2 = workItems2.find(w => w.id !== wi1.id);
            if (wi2) {
                // already handled above
                continue;
            }

            // OLD
            let nextSlide = await createFinalSlide(wi1);
            slides.push(nextSlide)
        }

        console.log("debug", snapShot2.workitems?.items)
        setGraph({
            debugWorkItems: workItems1,
            slides: slides,
        })

        let savedHuddleSession = await Db.upsertHuddleSession(huddleSession, p.session)
        if (!savedHuddleSession) {
            console.error("failed to upsert huddle session:", huddleSession)
        }
    }

    async function createNewSlide(wi2: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        return ({
            type: "new",
            id: wi2.id,
            title: wi2.title,
            fieldChanges: []
        })
    }

    function getParentFieldChange(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
        let s1: string = ""
        let s2: string = ""

        if (wi1.parent) {
            s1 = `#${wi1.parent}`
        } else {
            s1 = "(not set)"
        }

        if (wi2.parent) {
            s2 = `#${wi2.parent}`

        } else {
            s2 = "(not set)"
        }

        return { what: "System.Parent", prev: s1, next: s2 }
    }

    function getCommentFieldChange(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
        let s1: string = ""
        let s2: string = ""

        if (wi1.comments && (wi1.comments?.length || 0) > 0) {
            s1 = `${wi1.comments?.length}`
        } else {
            s1 = "0"
        }

        if (wi2.comments && (wi2.comments?.length || 0) > 0) {
            s2 = `${wi2.comments?.length}`

        } else {
            s2 = "0"
        }

        return { what: "System.CommentCount", prev: s1, next: s2 }
    }

    function getSomeFieldChange(what: string, prop: (wi: Db.WorkItemSnapshot) => any | undefined, wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
        let s1: string = ""
        let s2: string = ""

        if (prop(wi1)) {
            s1 = `${prop(wi1)}`
        } else {
            s1 = "(not set)"
        }

        if (prop(wi2)) {
            s2 = `${prop(wi2)}`

        } else {
            s2 = "(not set)"
        }

        return { what: what, prev: s1, next: s2 }
    }


    async function createFoundSlide(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        let fieldChanges: HuddleSlideFieldChange[] = []
        if (wi1.title !== wi2.title) { fieldChanges.push({ what: "System.Title", prev: wi1.title, next: wi2.title }) }
        if (wi1.state !== wi2.state) { fieldChanges.push({ what: "System.State", prev: wi1.state || "", next: wi2.state || "" }) }
        if (wi1.areaPath !== wi2.areaPath) { fieldChanges.push({ what: "System.AreaPath", prev: wi1.areaPath || "", next: wi2.areaPath || "" }) }
        if (wi1.iterationPath !== wi2.iterationPath) { fieldChanges.push({ what: "System.IterationPath", prev: wi1.iterationPath || "", next: wi2.iterationPath || "" }) }
        if (wi1.description !== wi2.description) { fieldChanges.push({ what: "System.Description", prev: wi1.description || "", next: wi2.description || "" }) }
        if (wi1.workItemType !== wi2.workItemType) { fieldChanges.push({ what: "System.WorkItemType", prev: wi1.workItemType || "", next: wi2.workItemType || "" }) }
        if (wi1.tags !== wi2.tags) { fieldChanges.push({ what: "System.Tags", prev: wi1.tags || "", next: wi2.tags || "" }) }
        if (wi1.backlogPriority !== wi2.backlogPriority) { fieldChanges.push(getSomeFieldChange("Microsoft.VSTS.Common.BacklogPriority", w => w.backlogPriority, wi1, wi2)) }
        if (wi1.reason !== wi2.reason) { fieldChanges.push(getSomeFieldChange("System.Reason", w => w.reason, wi1, wi2)) }
        if (wi1.startDate !== wi2.startDate) { fieldChanges.push(getSomeFieldChange("Microsoft.VSTS.Scheduling.StartDate", w => w.startDate, wi1, wi2)) }
        if (wi1.targetDate !== wi2.targetDate) { fieldChanges.push(getSomeFieldChange("Microsoft.VSTS.Scheduling.TargetDate", w => w.targetDate, wi1, wi2)) }
        if (wi1.parent !== wi2.parent) { { fieldChanges.push(getParentFieldChange(wi1, wi2)) } }
        if ((wi1.comments?.length || -1) !== (wi2.comments?.length || -1)) { { fieldChanges.push(getCommentFieldChange(wi1, wi2)) } }

        // TODO: priority should be based on position of snapshot in huddle session, not the raw value

        if (fieldChanges.length > 0) {
            return ({
                type: "update",
                id: wi2.id,
                title: wi2.title,
                fieldChanges: fieldChanges
            })
        } else {
            return ({
                type: "same",
                id: wi2.id,
                title: wi2.title,
                fieldChanges: []
            })
        }
    }

    async function createFinalSlide(wi1: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        // TODO: has changes or not)
        return ({
            type: "final",
            id: wi1.id,
            title: wi1.title,
            fieldChanges: []
        })
    }

    async function getSnapshot(query: Db.HuddleWorkItemQuery, asOf: number | null, session: Azdo.Session): Promise<Db.HuddleSessionSnapshot> {
        let workItemsResult = await Db.queryHuddleWorkItems(query, asOf, session)
        console.log("getSnapshot: workitems result:", workItemsResult)

        if (!workItemsResult.workItems) {
            console.error("getSnapshot: no work items result") // TODO: bug?
            return {
                workitems: {
                    items: []
                }
            }
        }

        let items: Db.WorkItemSnapshot[] = []
        for (const wi of workItemsResult.workItems) {
            let wid = wi.id
            if (!wid) { continue; } // TODO: error
            let wi2 = await Azdo.getWorkItem(wid, null, asOf, p.session)
            console.log("getSnapshot: work item", wid, wi2)

            let commentCount = wi2.fields?.['System.CommentCount'] ?? 0;
            if (commentCount > 0) {
                // TODO: fetch full comment details
                let wicomments = await Azdo.getWorkItemComments(wid, p.session)
                commentCount = wicomments?.count || commentCount
            }

            items.push({
                id: wid,
                title: wi2.fields?.['System.Title'] || "",
                priority: wi2.fields?.['Microsoft.VSTS.Common.Priority'] || Number.MAX_SAFE_INTEGER,
                state: wi2.fields?.['System.State'],
                areaPath: wi2.fields?.['System.AreaPath'],
                iterationPath: wi2.fields?.['System.IterationPath'],
                comments: Array.from({ length: commentCount }, (_v, k): Db.WorkItemSnapshotComment => { return { content: `TODO: Comment ${k}` } }),
                parent: wi2.fields?.['System.Parent'],
                description: wi2.fields?.['System.Description'],
                workItemType: wi2.fields?.['System.WorkItemType'],
                tags: wi2.fields?.['System.Tags'],
                backlogPriority: wi2.fields?.['Microsoft.VSTS.Common.BacklogPriority'],
                startDate: wi2.fields?.['Microsoft.VSTS.Scheduling.StartDate'],
                targetDate: wi2.fields?.['Microsoft.VSTS.Scheduling.TargetDate'],
                reason: wi2.fields?.['System.Reason'],
            })
        }

        // TODO: produce snapshot
        return {
            workitems: {
                items: items
            }
        }
    }

    async function poll() {
        console.log("HuddleSessionPage poll");
    }

    function onSelectSlide(_event: React.SyntheticEvent<HTMLElement, Event>, listRow: IListRow<HuddleSlide>) {
        setSelectedSlide(listRow.index)
    }

    function renderSlideList() {
        let slides = graph?.slides;
        if (!slides) { return <></> }

        let tasks = new ArrayItemProvider(slides)

        let selection = new ListSelection(true)
        if (selectedSlide !== undefined) {
            selection.select(selectedSlide, 1, false, false)
        }

        return (
            <ScrollableList
                itemProvider={tasks}
                renderRow={renderSlideListItem}
                selection={selection}
                onSelect={onSelectSlide}
                width="100%"
            />
        )
    }

    function renderPillGroup(item: HuddleSlide) {
        return <PillGroup className="flex-row" overflow={PillGroupOverflow.wrap}>
            {renderPillForSlideType(item)}
            {(item.fieldChanges) && (item.fieldChanges.map(fc => renderPillForFieldChange(fc)))}
        </PillGroup>
    }

    function renderPillForSlideType(item: HuddleSlide) {
        let what: { iconName: string, text: string } | undefined = (() => {
            switch (item.type) {
                case "new": return { iconName: "AddTo", text: "New" }
                case "final": return { iconName: "Blocked2", text: "Removed" }
                case "update": return undefined; // shown via field changes
                case "same": return undefined; // nothing interesting
                default: return undefined
            }
        })();

        if (!what) { return <></> }
        return <Pill variant={PillVariant.themedStandard} iconProps={{ iconName: what.iconName }} >{what.text}</Pill>
    }

    function iconPropsForSlideType(type: string): IIconProps {
        switch (type) {
            case "new": return { iconName: "AddTo" }
            case "final": return { iconName: "Blocked2" }
            case "update": return { iconName: "Edit" }
            case "same": return { iconName: "CircleRing" }
            default: return { iconName: "QuickNoteSolid" }
        }
    }

    function renderIconForSlideType(item: HuddleSlide) {
        let what: IIconProps = (() => { return iconPropsForSlideType(item.type) })();
        return <Icon iconName={what.iconName} size={IconSize.medium} />
    }

    function renderPillForFieldChange(fc: HuddleSlideFieldChange) {
        let what: string = (() => {
            switch (fc.what) {
                case "System.State": return "State"
                case "System.Title": return "Title"
                case "System.Description": return "Description"
                case "System.AreaPath": return "Area"
                case "System.IterationPath": return "Iteration"
                case "System.CommentCount": return "Comments"
                case "System.Parent": return "Parent"
                default: return fc.what
            }
        })();

        return <Pill variant={PillVariant.themedStandard} iconProps={{ iconName: "Edit" }} >{what}</Pill>
    }

    function renderSlideListItem(rowIndex: number, item: HuddleSlide, details: IListItemDetails<HuddleSlide>, key?: string) {
        return (
            <ListItem key={key || "list-item" + rowIndex} index={rowIndex} details={details}>
                <div className="list-example-row flex-row h-scroll-hidden padding-8 rhythm-horizontal-8">
                    {renderIconForSlideType(item)}
                    <div className="flex-column h-scroll-hidden rhythm-vertical-4">
                        <div className="flex-row rhythm-horizontal-8">
                            <div className="wrap-text font-size-ms font-weight-semibold">{item.id}</div>
                            <div className="wrap-text font-size-ms secondary-text">{item.title}</div>
                        </div>
                        {renderPillGroup(item)}
                    </div>
                </div>
            </ListItem>
        )
    }

    function renderSlideContent() {
        let slideIndex = selectedSlide
        let slides = graph?.slides
        if (slideIndex === undefined || slides === undefined || slideIndex >= slides.length) {
            return <></>
        }

        let slide = slides[slideIndex]
        if (!slide) {
            return <></>
        }

        // let s: string = `${slideIndex + 1}`
        // let a: string = `${slides.length}`

        return (
            <div className='padding-left-8 full-width'>
                <Card className='flex-self-start'>
                    <div className='flex-column'>
                        <Header
                            titleIconProps={iconPropsForSlideType(slide.type)}
                            title={slide.title}
                            titleSize={TitleSize.Medium}
                        />
                        {
                            slide.fieldChanges.map(c => {
                                return (
                                    <div className='flex-row rhythm-horizontal-8'>
                                        <div>{c.what}</div>
                                        <Icon iconName={"CircleRing"} size={IconSize.small} />
                                        <div>{c.prev}</div>
                                        <Icon iconName={"ChevronRight"} size={IconSize.small} />
                                        <div>{c.next}</div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </Card>
            </div>
        );
    }

    // function renderHeader() {
    //     return <SingleLayerMasterPanelHeader title={"Slides"} />
    // }

    function renderContent(_selection: any, _itemProvider: any) {
        return (renderSlideList())
    }

    // const [selection] = React.useState(new ListSelection({ selectOnFocus: false }));
    let selection = new ListSelection(true)
    // const [itemProvider] = React.useState(new ArrayItemProvider(sampleDate));
    let itemProvider = new ArrayItemProvider(graph?.slides || [])
    // const [selectedItemObservable] = React.useState(new ObservableValue<string>(sampleDate[0]));

    return (
        <Page>
            <Header
                title={title}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            <div className="page-content page-content-top">
                <div className="flex-row">
                    <SingleLayerMasterPanel
                        className="master-example-panel show-on-small-screens"
                        // renderHeader={renderHeader}
                        renderContent={() => renderContent(selection, itemProvider)}
                    />
                    {renderSlideContent()}
                </div>
            </div>
        </Page>
    )
}

export interface HuddleSessionPageProps {
    huddleId: string
    huddleSessionId: string
    previousHuddleSessionId?: string
    appNav: AppNav;
    database: Db.Database;
    session: Azdo.Session;
}

export default HuddleSessionPage