import { toPng, toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { TechNode, TechEdge, NotionRef } from '../types';
import { buildNotionLink } from './csvImport';

export const exportToPng = async () => {
  const element = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!element) return;

  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    width: element.offsetWidth * 2,
    height: element.offsetHeight * 2,
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
    }
  });
  saveAs(dataUrl, 'techtree.png');
};

export const exportToSvg = async () => {
  const element = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!element) return;

  const dataUrl = await toSvg(element, {
    backgroundColor: '#ffffff',
  });
  saveAs(dataUrl, 'techtree.svg');
};

export const exportToCsv = (nodes: TechNode[], edges: TechEdge[]) => {
  const data = nodes.map(node => ({
    id: node.id,
    label: node.data.label,
    act: node.data.act,
    stage: node.data.stage,
    category: node.data.category,
    dependencies: edges
      .filter(e => e.target === node.id)
      .map(e => e.source)
      .join(', '),
    ...node.data
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'techtree_nodes.csv');
};

/** Helper: build a Notion-style link string for a node reference */
const buildNodeNotionLink = (nodeId: string, nodes: TechNode[]): string => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return nodeId;
  const name = node.data.label || nodeId;
  const pageId = node.data.notionPageId;
  if (pageId) {
    return `${name} (https://www.notion.so/${pageId}?pvs=21)`;
  }
  return name;
};

/** Helper: rebuild Notion refs array into comma-separated link string */
const buildNotionRefString = (refs: NotionRef[] | undefined): string => {
  if (!refs || refs.length === 0) return '';
  return refs.map(buildNotionLink).join(', ');
};

/** Export in Notion Crafts-compatible CSV format — full roundtrip with Notion link restoration */
export const exportToNotionCsv = (nodes: TechNode[], edges: TechEdge[]) => {
  const data = nodes.map(node => {
    const d = node.data;

    // Rebuild PrevTechs and NextTechs as Notion-style relation strings
    const prevEdges = edges.filter(e => e.target === node.id);
    const nextEdges = edges.filter(e => e.source === node.id);

    // Use stored refs if available, otherwise build from edge data
    const prevTechsStr = d.prevTechRefs && d.prevTechRefs.length > 0
      ? buildNotionRefString(d.prevTechRefs)
      : prevEdges.map(e => buildNodeNotionLink(e.source, nodes)).join(', ');

    const nextTechsStr = d.nextTechRefs && d.nextTechRefs.length > 0
      ? buildNotionRefString(d.nextTechRefs)
      : nextEdges.map(e => buildNodeNotionLink(e.target, nodes)).join(', ');

    // Rebuild Ingridients with Notion links
    const ingredientsStr = d.ingredients && d.ingredients.length > 0
      ? d.ingredients.map(buildNotionLink).join(', ')
      : '';

    // Rebuild UsedStation with Notion links
    const usedStationStr = d.usedStations && d.usedStations.length > 0
      ? d.usedStations.map(buildNotionLink).join(', ')
      : '';

    // Rebuild OutputItem with Notion link
    const outputItemStr = d.outputItemRef
      ? buildNotionLink(d.outputItemRef)
      : d.outputItem || '';

    // Rebuild RecipeDetail with quantities
    const recipeDetailStr = d.recipeDetail && d.recipeDetail.length > 0
      ? d.recipeDetail.map(r => {
          const link = buildNotionLink(r);
          return r.qty ? `${link} ${r.qty}шт` : link;
        }).join(';\n')
      : '';

    // Rebuild OpenCondition (pass-through, may contain Notion links)
    const openConditionStr = d.openCondition || '';

    return {
      WorkingName: d.label ?? node.id,
      ActAndStage: d.act ?? '',
      ActStage: d.stage ?? '',
      CategoryFromItem: d.category ?? '',
      CraftStationPowerType: d.powerType ?? '',
      CraftStatusInGame: d.gameStatus ?? '',
      'Created time': d.createdAt ?? '',
      Description: d.description ?? '',
      ElectricCost: d.electricCost ?? '',
      ElectricToResearch: d.ElectricToResearch ?? '',
      Ingridients: ingredientsStr,
      ItemCategory: d.ItemCategory ?? d.category ?? '',
      ItemLootingInAct: d.itemLootingInAct ?? '',
      'Last edited time': d.updatedAt ?? '',
      NextTechs: nextTechsStr,
      Notes: d.notes ?? '',
      OpenCondition: openConditionStr,
      OutputDetail: d.outputDetail ?? '',
      OutputItem: outputItemStr,
      PrevTechs: prevTechsStr,
      PrevTechIDs: prevEdges.map(e => e.source).join(', '),
      RecipeDetail: recipeDetailStr,
      ResearchTime: d.researchTime ?? '',
      RollupCategory: d.RollupCategory ?? d.category ?? '',
      TechCraftDesignStatus: d.designStatus ?? '',
      TechCraftID: d.techCraftId ?? node.id,
      TechCraftNotionStatus: d.notionSyncStatus ?? '',
      TechForAct: d.techForAct ?? '',
      TechStatusInGame: d.techGameStatus ?? '',
      TechTerms: d.TechTerms ?? '',
      UsedStation: usedStationStr,
      formulaIngridients: d.formulaIngridients ?? '',
      formulaUsedStation: d.formulaUsedStation ?? '',
    };
  });

  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'techtree_notion.csv');
};

export const exportToDrawIo = (nodes: TechNode[], edges: TechEdge[]) => {
  // Escape XML special characters in values
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Build proper Draw.io XML structure
  const timestamp = new Date().toISOString();
  const diagramId = `diagram-${Date.now()}`;

  const mxGraphModel = `    <mxGraphModel dx="1426" dy="748" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${nodes.map(node => {
    const label = escapeXml(node.data.label || node.id);
    const x = Math.round(node.position.x);
    const y = Math.round(node.position.y);
    return `        <mxCell id="${escapeXml(node.id)}" value="${label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="150" height="60" as="geometry"/>
        </mxCell>`;
  }).join('\n')}
${edges.map(edge => {
    return `        <mxCell id="${escapeXml(edge.id)}" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;endFill=1;" edge="1" parent="1" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`;
  }).join('\n')}
      </root>
    </mxGraphModel>`;

  // Proper mxfile structure that Draw.io can open
  const xml = `<mxfile host="TechTree Studio" modified="${timestamp}" agent="TechTree Studio" version="1.0" type="device">
  <diagram id="${diagramId}" name="Tech Tree">
${mxGraphModel}
  </diagram>
</mxfile>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  saveAs(blob, 'techtree.drawio');
};
