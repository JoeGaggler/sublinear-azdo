// TODO: show removed in its original location for fewer up/down indicators:
// - no diff for current session
// - future session filters out "removed", so relative positions will match
// TODO: flag when a child has an issue
// TODO: allow "throwing a flag" during a huddle
// TODO: show new comment content
// TODO: add filters to slides
// TODO: show "state" on slide content
// TODO: quick buttons for changing target date to next cycle(s)
// TODO: quick button to set start date to current sprint (and activate it?)

import * as SDK from 'azure-devops-extension-sdk';

import * as Azdo from '../api/azdo.ts';
import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React from 'react'
import * as Luxon from 'luxon'

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
import type { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { type IWorkItemFormNavigationService } from "azure-devops-extension-api/WorkItemTracking";
import type { IColor } from 'azure-devops-extension-api';
import PersonaField from '../controls/PersonaField.tsx';
import HuddleSlideField from '../controls/HuddleSlideField.tsx';
import TargetDatePanel from '../controls/TargetDatePanel.tsx';
import FieldChange from '../controls/FieldChange.tsx';

interface HuddleGraph {
    slides: HuddleSlide[]
}

interface HuddleSlide {
    type: string
    id: number
    title: string
    workItemType: string
    pills: HuddleSlidePill[]
    workItem: Db.WorkItemSnapshot
}

interface HuddleSlidePill {
    text?: string
    color?: IColor
    iconProps?: IIconProps
    message?: JSX.Element
}

interface ReducerState {
    title: string,
    created?: number
    availableWorkItemTypes: Azdo.WorkItemType[]
    selectedSlide: number | null,
    huddleGraph?: HuddleGraph
    cycles?: Db.HuddleCycle[]
    activePanelName?: string
    workitemRevisions?: WorkItemRevisionsReducerState
}

interface ReducerAction {
    title?: string
    created?: number
    availableWorkItemTypes?: Azdo.WorkItemType[]
    selectedSlide?: number | null
    snapShot1?: Db.HuddleSessionSnapshot
    snapShot2?: Db.HuddleSessionSnapshot
    cycles?: Db.HuddleCycle[]
    activePanelName?: string | null
    workitemRevisions?: WorkItemRevisionsReducerState
}

interface WorkItemRevisionsReducerState {
    id: number,
    revs: Azdo.GetWorkItemUpdatesValue[]
}

function reducer(state: ReducerState, action: ReducerAction): ReducerState {
    let next = {
        ...state
    }

    // quick setters
    if (action.title !== undefined) { next.title = action.title }
    if (action.created !== undefined) { next.created = action.created }
    if (action.availableWorkItemTypes !== undefined) { next.availableWorkItemTypes = action.availableWorkItemTypes }
    if (action.selectedSlide !== undefined) { next.selectedSlide = action.selectedSlide }
    if (action.cycles !== undefined) { next.cycles = action.cycles }
    if (action.snapShot1 !== undefined && action.snapShot2 !== undefined) {
        next.huddleGraph = reducerHuddleGraph(action.snapShot1, action.snapShot2, next)
    }

    // panel
    if (action.activePanelName === null) { next.activePanelName = undefined }
    else if (action.activePanelName !== undefined) { next.activePanelName = action.activePanelName }

    // work item revisions
    let wir = action.workitemRevisions || next.workitemRevisions
    if (typeof next.selectedSlide === "number" && next.huddleGraph) {
        let slide = next.huddleGraph.slides[next.selectedSlide]
        let swid = slide.id

        if (wir !== undefined) {
            let wid = wir.id
            if (wid !== swid) {
                wir = undefined
            }
        }
    } else {
        wir = undefined
    }
    next.workitemRevisions = wir

    console.log("REDUCER2", state, next)
    return next
}

function reducerHuddleGraph(snapShot1: Db.HuddleSessionSnapshot, snapShot2: Db.HuddleSessionSnapshot, state: ReducerState): HuddleGraph {
    let workItems1 = snapShot1.workitems?.items || []
    let workItems2 = snapShot2.workitems?.items || []

    let slides: HuddleSlide[] = []
    for (let wi2 of workItems2) {
        // NEW
        let wi1 = workItems1.find(w => w.id === wi2.id)
        if (!wi1) {
            let nextSlide: HuddleSlide = {
                type: "new",
                id: wi2.id,
                title: wi2.title,
                workItemType: wi2.workItemType || "unknown", // TODO: filter out?
                pills: createPillsList(wi2, state),
                workItem: wi2,
            }
            slides.push(nextSlide)
            continue;
        }

        // MATCHED
        let nextSlide = createFoundSlide(wi1, wi2, state);
        slides.push(nextSlide)
    }

    // TODO: final slide should appear in original position
    for (let wi1 of workItems1) {
        let wi2 = workItems2.find(w => w.id === wi1.id);
        if (wi2) {
            // already handled above
            continue;
        }

        // OLD
        let nextSlide = createFinalSlide(wi1, state);
        slides.push(nextSlide)
    }

    console.log("debug", snapShot2.workitems?.items)
    return {
        slides: slides,
    }
}

function createFoundSlide(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot, state: ReducerState): HuddleSlide {
    function dateFormatter(prop: (s: Db.WorkItemSnapshot) => string | undefined): (s: Db.WorkItemSnapshot) => string | undefined {
        return snapshot => {
            let v = prop(snapshot)
            return v && (Util.msecToDate(Util.msecFromISO(v)).toLocaleDateString())
        }
    };
    function conv(old: any): HuddleSlidePill {
        return {
            text: old.what,
            color: undefined,
            iconProps: { iconName: "Edit" },
            message: <FieldChange prev={old.prev} next={old.next} />
        }
    }
    let fieldChanges: HuddleSlidePill[] = []
    if (wi1.title !== wi2.title) { fieldChanges.push(conv({ what: "Title", prev: wi1.title, next: wi2.title })) }
    if (wi1.state !== wi2.state) { fieldChanges.push(conv({ what: "State", prev: wi1.state || "", next: wi2.state || "" })) }
    if (wi1.areaPath !== wi2.areaPath) { fieldChanges.push(conv({ what: "Area", prev: wi1.areaPath || "", next: wi2.areaPath || "" })) }
    if (wi1.iterationPath !== wi2.iterationPath) { fieldChanges.push(conv({ what: "Iteration", prev: wi1.iterationPath || "", next: wi2.iterationPath || "" })) }
    if (wi1.description !== wi2.description) { fieldChanges.push(conv({ what: "Description", prev: wi1.description || "", next: wi2.description || "" })) }
    if (wi1.workItemType !== wi2.workItemType) { fieldChanges.push(conv({ what: "Type", prev: wi1.workItemType || "", next: wi2.workItemType || "" })) }
    if (wi1.tags !== wi2.tags) { fieldChanges.push(conv({ what: "Tags", prev: wi1.tags || "", next: wi2.tags || "" })) }
    // if (wi1.reason !== wi2.reason) { fieldChanges.push(getSomeFieldChange("Reason", w => w.reason, wi1, wi2)) }
    if (wi1.startDate !== wi2.startDate) { fieldChanges.push(getSomeFieldChange("Start Date", dateFormatter(w => w.startDate), wi1, wi2)) }
    if (wi1.targetDate !== wi2.targetDate) { fieldChanges.push(getSomeFieldChange("Target Date", dateFormatter(w => w.targetDate), wi1, wi2)) }
    if (wi1.parent !== wi2.parent) { fieldChanges.push(getSomeFieldChange("Parent", w => w.parent === undefined ? undefined : `#${w.parent}`, wi1, wi2)) }
    if (wi1.workItemType !== wi2.workItemType) { fieldChanges.push(getSomeFieldChange("Type", w => w.workItemType, wi1, wi2)) }
    if ((wi1.comments?.length || -1) !== (wi2.comments?.length || -1)) { fieldChanges.push(getCommentFieldChange(wi1, wi2)) }

    let priorityPills: HuddleSlidePill[] = []
    let p1 = wi1.relativePriority
    let p2 = wi2.relativePriority
    if (p2 === undefined) {
        // error: current snapshot should have this
    } else if (p1 === undefined) {
        // skip: previous snapshot never calculated its value
    } else if (p1 > p2) {
        priorityPills.push({
            text: `${p2 + 1}`,
            message: <div>Moved up from {p1 + 1} to {p2 + 1}</div>,
            color: { red: 0, green: 0x99, blue: 0x99 },
            iconProps: {
                iconName: "Up"
            }
        })
    } else if (p1 < p2) {
        priorityPills.push({
            text: `${p2 + 1}`,
            message: <div>Moved down from {p1 + 1} to {p2 + 1}</div>,
            color: { red: 0, green: 0x99, blue: 0x99 },
            iconProps: {
                iconName: "Down"
            }
        })
    } else {
        // skip: no change
    }

    if (fieldChanges.length > 0) {
        return ({
            type: "update",
            id: wi2.id,
            title: wi2.title,
            workItemType: wi2.workItemType || "unknown",
            workItem: wi2,
            pills: [
                ...priorityPills,
                ...createPillsList(wi2, state),
                ...fieldChanges,
            ],
        })
    } else {
        return ({
            type: "same",
            id: wi2.id,
            title: wi2.title,
            workItemType: wi2.workItemType || "unknown",
            workItem: wi2,
            pills: [
                ...priorityPills,
                ...createPillsList(wi2, state),
            ],
        })
    }
}

function createFinalSlide(wi1: Db.WorkItemSnapshot, state: ReducerState): HuddleSlide {
    // TODO: has changes or not)
    return ({
        type: "final",
        id: wi1.id,
        title: wi1.title,
        workItemType: wi1.workItemType || "unknown",
        workItem: wi1,
        pills: createPillsList(wi1, state)
    })
}

function createPillsList(wi: Db.WorkItemSnapshot, state: ReducerState): HuddleSlidePill[] {
    let pills: HuddleSlidePill[] = []

    // Overdue
    let targetDateMsec: number | undefined = wi.targetDate ? Util.msecFromISO(wi.targetDate) : undefined
    let targetCycle = Db.getCycleForDateOrIteration(state.cycles || [], targetDateMsec, wi.iterationPath)
    if (targetCycle) {
        targetDateMsec = targetCycle.finishMsec
    }
    if (targetDateMsec && state.created && state.created >= targetDateMsec) {
        pills.push({
            text: "Overdue",
            color: {
                red: 0xcc,
                green: 0,
                blue: 0,
            },
            message: <div>Target date was {Util.msecToDate(targetDateMsec).toLocaleDateString()}</div>
        })
    }

    // No Start
    if (wi.startDate === undefined) {
        let s = wi.state
        if (s === "In Progress") {
            pills.push({
                text: "Started?",
                color: {
                    red: 0xcc,
                    green: 0x66,
                    blue: 0,
                },
                message: <div>Missing start date</div>
            })
        }
    }

    return pills;
}

function getSomeFieldChange(what: string, prop: (wi: Db.WorkItemSnapshot) => string | undefined, wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlidePill {
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

    return {
        text: what,
        color: undefined,
        iconProps: { iconName: "Edit" },
        message: <FieldChange prev={s1} next={s2} />
    }
}

function getCommentFieldChange(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlidePill {
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

    return {
        text: "Comments",
        color: undefined,
        iconProps: { iconName: "Edit" },
        message: <FieldChange prev={s1} next={s2} />
    }
}

function HuddleSessionPage(p: HuddleSessionPageProps) {
    const [state, dispatch] = React.useReducer<(state: ReducerState, action: ReducerAction) => ReducerState>(reducer, {
        title: "",
        availableWorkItemTypes: [],
        selectedSlide: null,
    })

    Util.useInterval(poll, 1000);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let huddle = await Db.getHuddleDocument(p.huddleId, p.session)
        if (!huddle) {
            // TODO: fail
            console.error("HuddleSessionPage: missing huddle");
            return
        }

        console.log("HuddleSessionPage: huddle", huddle);

        let t = await Azdo.getWorkItemTypes(p.session) // TODO: make separately async?
        let c = await Azdo.getIterations(huddle.team, p.session)
        if (c && c.value) {
            let cycles = c.value.flatMap((i): Db.HuddleCycle | readonly Db.HuddleCycle[] => {
                let n = i.name
                let p = i.path
                let s = i.attributes?.startDate
                let f = i.attributes?.finishDate
                if (n && p && s && f) {
                    return {
                        name: n,
                        path: p,
                        startMsec: Util.msecFromISO(s),
                        finishMsec: Util.msecFromISO(f),
                    }
                } else {
                    return []
                }
            })
            dispatch({
                cycles: cycles
            })
        }

        let huddleSession = await Db.requireHuddleSessionStoredDocument(p.huddleSessionId, p.session)
        let created = huddleSession.created || Util.msecNow()
        huddleSession.created = created
        console.log("HuddleSessionPage: huddle session", huddleSession, created);
        dispatch({
            title: `${huddle?.name || ""} Session - ${Util.msecToDate(created).toLocaleDateString()}`,
            created: created,
            availableWorkItemTypes: t.value,
        })

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

            snapShot2 = await getSnapshot(workItemQuery, created, p.session)
            huddleSession.snapshot = snapShot2
        }

        let savedHuddleSession = await Db.upsertHuddleSession(huddleSession, p.session)
        if (!savedHuddleSession) {
            console.error("failed to upsert huddle session:", huddleSession)
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

        console.log("Snapshot1:", snapShot1)
        console.log("Snapshot2:", snapShot2)
        dispatch({
            snapShot1: snapShot1,
            snapShot2: snapShot2,
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

        let batchIds: number[] = workItemsResult.workItems
            .map(i => i.id)
            .filter((id): id is number => id !== undefined)

        let metaBatches: Azdo.GetWorkItemResult[][] = []

        let level = 0
        while (batchIds.length > 0) {
            level = level + 1
            let currentBatchIds = batchIds
            batchIds = []
            let batch = await Azdo.getWorkItemBatchWithChunks(currentBatchIds, null, asOf, session)
            console.log("getSnapshot batch", level, batch.length, batch)

            metaBatches.push(batch)

            for (const wi of batch) {
                let wid = wi.id
                if (!wid) { continue; }

                let parentId = wi.fields?.['System.Parent']
                if (parentId) {
                    batchIds.push(parentId)
                }
            }
        }

        if (metaBatches.length == 0) {
            return {
                workitems: {
                    items: []
                }
            }
        }

        let priorityMappings: PriorityMapping[] = []
        interface PriorityMapping {
            id: number
            values: number[]
        }

        function getPriorityMapping(id: number): number[] | undefined {
            let found = priorityMappings.find(m => m.id === id)
            if (found === undefined) { return undefined }
            return found.values
        }

        let items: Db.WorkItemSnapshot[] = []
        for (let m = metaBatches.length - 1; m >= 0; m--) {
            let metaBatch = metaBatches[m]
            for (let wi of metaBatch) {
                let wid = wi.id
                let wif = wi.fields
                if (!wid || !wif) { continue; }

                let p0 = wif['Microsoft.VSTS.Common.BacklogPriority'] || Number.MAX_SAFE_INTEGER
                let priorities: number[] = [p0]

                let pid = wif['System.Parent']
                if (pid) {
                    let par = getPriorityMapping(pid)
                    if (par) {
                        priorities = [
                            ...par,
                            p0
                        ]
                    }
                } else {
                    console.warn("No parent for", wid)
                }

                // TODO: error if already exists?

                priorityMappings.push({
                    id: wid,
                    values: priorities,
                })
            }
        }

        console.log("PRIORITY MAPPINGS", priorityMappings)

        let mainBatch = metaBatches[0]
        for (let wi of mainBatch) {
            let wid = wi.id
            let wif = wi.fields
            if (!wid || !wif) { continue; }

            let commentCount = wif['System.CommentCount'] ?? 0;
            let comments = Array.from(
                { length: commentCount },
                (_v, k): Db.WorkItemSnapshotComment => { return { content: `TODO: Comment ${k}` } }
            )

            // Assigned
            let assignedTo = wif['System.AssignedTo']

            items.push({
                id: wid,
                title: wif['System.Title'] || "",
                priority: wif['Microsoft.VSTS.Common.Priority'] || Number.MAX_SAFE_INTEGER,
                state: wif['System.State'],
                areaPath: wif['System.AreaPath'],
                iterationPath: wif['System.IterationPath'],
                comments: comments,
                parent: wif['System.Parent'],
                description: wif['System.Description'],
                workItemType: wif['System.WorkItemType'],
                tags: wif['System.Tags'],
                backlogPriority: wif['Microsoft.VSTS.Common.BacklogPriority'],
                backlogPriorities: getPriorityMapping(wid),
                startDate: wif['Microsoft.VSTS.Scheduling.StartDate'],
                targetDate: wif['Microsoft.VSTS.Scheduling.TargetDate'],
                reason: wif['System.Reason'],
                assignedTo: (assignedTo !== undefined) ? (
                    {
                        id: assignedTo.id,
                        name: assignedTo.displayName,
                        imageUrl: assignedTo.imageUrl
                    }) : undefined,
            })
        }

        function findSiblings(pid: number | undefined): Db.WorkItemSnapshot[] {
            let sibs: Db.WorkItemSnapshot[] = []
            for (let sib of items) {
                let spid = sib.parent
                if (spid !== pid) { continue; }
                sibs.push(sib)
            }

            sibs.sort(Db.sortWorkItemSnapshots)
            return sibs
        }
        for (let item of items) {
            let wid = item.id
            if (!wid) { continue; }
            let pid = item.parent
            let sibs = findSiblings(pid)
            let rp = sibs.findIndex(i => i.id == wid)
            item.relativePriority = (rp == -1) ? undefined : rp
        }

        items.sort(Db.sortWorkItemSnapshots)

        return {
            workitems: {
                items: items
            }
        }
    }

    async function poll() {
        console.log("HuddleSessionPage poll", state);
    }

    function onSelectSlide(_event: React.SyntheticEvent<HTMLElement, Event>, listRow: IListRow<HuddleSlide>) {
        let selectedSlide = listRow.index

        dispatch({
            selectedSlide: selectedSlide
        })

        if (state.huddleGraph && selectedSlide >= 0 && selectedSlide < state.huddleGraph.slides.length) {
            let slide = state.huddleGraph.slides[selectedSlide]
            fetchWorkItemDetails(slide)

            async function fetchWorkItemDetails(slide: HuddleSlide) {
                let wid = slide.id
                let aaa = await Azdo.getWorkItemUpdates(wid, p.session)
                dispatch({
                    workitemRevisions: {
                        id: wid,
                        revs: aaa.value,
                    }
                })
            }
        }
    }

    function onActivateSlide(_event: React.SyntheticEvent<HTMLElement, Event>, listRow: IListRow<HuddleSlide>) {
        dispatch({
            selectedSlide: listRow.index
        })

        onOpenWorkItem(listRow.data.id)
    }

    function renderSlideList() {
        let slides = state.huddleGraph?.slides;
        if (!slides) { return <></> }

        let tasks = new ArrayItemProvider(slides)

        let selection = new ListSelection(true)
        if (state.selectedSlide !== null) {
            selection.select(state.selectedSlide, 1, false, false)
        }

        return (
            <ScrollableList
                itemProvider={tasks}
                renderRow={renderSlideListItem}
                selection={selection}
                onSelect={onSelectSlide}
                onActivate={onActivateSlide}
                width="100%"
            />
        )
    }

    function renderPillGroup(item: HuddleSlide) {
        return <PillGroup className="flex-row" overflow={PillGroupOverflow.fade}>
            {renderPillForSlideType(item)}
            {(item.pills) && (item.pills.map(p => renderPillListItem(p)))}
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

    function renderWorkItemHeader(item: HuddleSlide, className: string = ""): JSX.Element {
        return (
            <div className={`flex-row flex-center rhythm-horizontal-4 ${className}`}>
                {renderIconForWorkItemType(item)}
                <div className="font-weight-semibold">{item.id}</div>
                <div className="secondary-text text-ellipsis">{item.title}</div>
            </div>
        )
    }

    function renderIconForWorkItemType(item: HuddleSlide) {
        let availableWorkItemTypes = state.availableWorkItemTypes
        let wit = item.workItemType || "unknown";
        let wit2 = availableWorkItemTypes.findIndex(i => i.name === wit);
        let wit3 = (wit2 === -1) ? undefined : availableWorkItemTypes[wit2].icon
        if (wit3 && wit3.url) {
            return <Icon render={() => {
                return <img src={wit3.url} width={16} height={16} />
            }} />
        }
        else { return <></> }
    }

    function renderPillListItem(p: HuddleSlidePill) {
        return <Pill variant={PillVariant.themedStandard} color={p.color} iconProps={p.iconProps}>{p.text || ""}</Pill>
    }

    function renderSlideListItem(rowIndex: number, item: HuddleSlide, details: IListItemDetails<HuddleSlide>, key?: string) {
        return (
            <ListItem key={key || "list-item" + rowIndex} index={rowIndex} details={details}>
                <div className="list-example-row flex-row padding-4 rhythm-horizontal-8 scroll-hidden">
                    <div className="flex-column rhythm-vertical-4 scroll-hidden">
                        {renderWorkItemHeader(item, "font-size-ms scroll-hidden")}
                        <div className='margin-left-16'>{renderPillGroup(item)}</div>
                    </div>
                </div>
            </ListItem>
        )
    }

    async function onOpenWorkItem(wid: number) {
        const navSvc = await SDK.getService<IWorkItemFormNavigationService>(
            "ms.vss-work-web.work-item-form-navigation-service"
        );

        await navSvc.openWorkItem(wid, false)
    };

    function getSlideBarCommandItems(slide: HuddleSlide) {
        let items: IHeaderCommandBarItem[] = []

        let editItem: IHeaderCommandBarItem = {
            id: "openWorkItem",
            text: "Open",
            iconProps: { iconName: "OpenInNewTab" },
            onActivate: () => {
                onOpenWorkItem(slide.id)
            },
            isPrimary: true,
            important: true,
        }
        items.push(editItem)

        return items;
    }

    function renderWorkItemState(slide: HuddleSlide) {
        switch (slide.workItem.state) {
            case undefined: return <></>
            case null: return <></>
            default: return <>{slide.workItem.state}</>
        }
    }

    function renderAssigned(slide: HuddleSlide) {
        let u = slide.workItem.assignedTo
        return u && <PersonaField name={u.name} imageUrl={u.imageUrl} />
    }

    function renderCycleFromDateString(dateString?: string, path?: string, isFinish: boolean = true) {
        let dateMsec = (dateString && Util.msecFromISO(dateString)) || undefined
        let targetCycle = Db.getCycleForDateOrIteration(state.cycles || [], dateMsec, path)
        if (targetCycle) {
            dateMsec = isFinish ? targetCycle.finishMsec : targetCycle.startMsec
        }

        if (targetCycle) {
            return <div className='flex-row rhythm-horizontal-4'>
                <div>{targetCycle.name}</div>
                {dateMsec && <div className='flex-row'>({Luxon.DateTime.fromMillis(dateMsec).toRelative()})</div>}
            </div>
        } else {
            return <></>
        }
    }

    function renderPillsCard(slide: HuddleSlide) {
        if (slide.pills.length === 0) { return <></> }

        return (
            <Card className='flex-self-start'>
                <div className='flex-column full-width flex-start rhythm-vertical-4'>
                    {
                        slide.pills.map(p => {
                            return (
                                <div className='flex-row flex-center rhythm-horizontal-8'>
                                    <div className=''>{renderPillListItem(p)}</div>
                                    <div className=''>{p.message || ""}</div>
                                </div>
                            )
                        })
                    }
                </div>
            </Card>
        )
    }

    function renderSlideContent() {
        let slideIndex = state.selectedSlide
        let slides = state.huddleGraph?.slides
        if (slideIndex === null || slides === undefined || slideIndex >= slides.length) {
            return <></>
        }

        let slide = slides[slideIndex]
        if (!slide) {
            return <></>
        }

        return (
            <div className='padding-left-8 full-width sticky-top-0 rhythm-vertical-8'>
                <Header
                    titleIconProps={undefined}
                    title={renderWorkItemHeader(slide, "font-size-l")}
                    titleSize={TitleSize.Medium}
                    contentClassName='flex-center'
                    commandBarItems={getSlideBarCommandItems(slide)}
                />
                <div className='flex-column full-width flex-start rhythm-vertical-8'>
                    <HuddleSlideField
                        name='State'
                        className='font-size-l'
                        onClickHeading={() => { }}
                    >
                        {renderWorkItemState(slide)}
                    </HuddleSlideField>

                    <HuddleSlideField
                        name='Assigned'
                        className='font-size-l'
                        onClickHeading={() => { }}
                    >
                        {renderAssigned(slide)}
                    </HuddleSlideField>

                    <HuddleSlideField
                        name='Start Date'
                        className='font-size-l'
                        onClickHeading={() => { }}
                    >
                        {renderCycleFromDateString(slide.workItem.startDate)}
                    </HuddleSlideField>

                    <HuddleSlideField
                        name='Target Date'
                        className='font-size-l'
                        onClickHeading={() => { dispatch({ activePanelName: "target_date" }) }}
                    >
                        {renderCycleFromDateString(slide.workItem.targetDate, slide.workItem.iterationPath, true)}
                    </HuddleSlideField>

                    {renderPillsCard(slide)}
                </div>
            </div>
        );
    }

    // function renderHeader() {
    //     return <SingleLayerMasterPanelHeader title={"Slides"} />
    // }

    function renderContent(_selection: any, _itemProvider: any) {
        return (renderSlideList())
    }

    function onDismissTargetDatePanel() {
        dispatch({
            activePanelName: null,
        })
    }

    // const [selection] = React.useState(new ListSelection({ selectOnFocus: false }));
    let selection = new ListSelection(true)
    // const [itemProvider] = React.useState(new ArrayItemProvider(sampleDate));
    let itemProvider = new ArrayItemProvider(state.huddleGraph?.slides || [])

    // const [selectedItemObservable] = React.useState(new ObservableValue<string>(sampleDate[0]));

    return (
        <Page className='full-height'>
            <Header
                title={state.title}
                titleSize={TitleSize.Large}
                contentClassName='flex-center'
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            <div className="page-content page-content-top">
                <div className="flex-row flex-start">
                    <SingleLayerMasterPanel
                        className="master-example-panel show-on-small-screens"
                        // renderHeader={renderHeader}
                        renderContent={() => renderContent(selection, itemProvider)}
                    />
                    {renderSlideContent()}
                </div>
            </div>
            {state.activePanelName == "target_date" && (
                <TargetDatePanel onDismiss={() => { onDismissTargetDatePanel() }}>
                    <div className='flex-column rhythm-vertical-8'>
                        {
                            state.workitemRevisions &&
                            state.workitemRevisions.revs
                                .filter(rev => rev.fields?.['System.IterationPath'] || rev.fields?.["Microsoft.VSTS.Scheduling.TargetDate"])
                                .map(rev => {
                                    let rd1 = rev.fields?.["System.ChangedDate"]?.newValue
                                    let rd2 = rd1 && Util.msecFromISO(rd1)
                                    let rd3 = rd2 && Util.msecToDate(rd2)
                                    let rd4 = rd3 && rd3.toLocaleDateString()
                                    let rd5 = rd2 && Util.msecToRelative(rd2)

                                    let td0 = rev.fields?.["Microsoft.VSTS.Scheduling.TargetDate"]
                                    let td1 = td0 && td0.newValue
                                    let td2 = td1 && Util.msecFromISO(td1)
                                    let td3 = td2 && Util.msecToDateString(td2)

                                    let ip0 = rev.fields?.['System.IterationPath']
                                    let ip1 = ip0 && ip0.newValue
                                    return (
                                        <>
                                            {rd4 && rd5 && td0 &&
                                                <div className='flex-row rhythm-horizontal-8'>
                                                    <div>{rd5}</div>
                                                    <div className='flex-row font-weight-heavy'><Icon iconName={"Forward"} size={IconSize.medium} /></div>
                                                    <div>{td3 || "none"}</div>
                                                </div>
                                            }
                                            {ip0 &&
                                                <div className='flex-row rhythm-horizontal-8'>
                                                    <div>{rd5}</div>
                                                    <div className='flex-row font-weight-heavy'><Icon iconName={"Forward"} size={IconSize.medium} /></div>
                                                    <div>{ip1 || "none"}</div>
                                                </div>
                                            }
                                        </>
                                    )
                                })
                        }
                    </div>
                </TargetDatePanel>
            )}
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


