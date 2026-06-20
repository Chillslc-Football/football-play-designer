export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export type HelpSectionContent = {
  id: string
  title: string
  defaultOpen?: boolean
  blocks: HelpBlock[]
}

export const HELP_SECTIONS: HelpSectionContent[] = [
  {
    id: 'whats-new',
    title: "What's New",
    defaultOpen: true,
    blocks: [
      {
        type: 'paragraph',
        text: 'Recent updates focus on faster play entry, cleaner route editing, and printable wristband cards.',
      },
      {
        type: 'list',
        items: [
          'Player Action Chains — each player can have multiple ordered route, motion, and block actions.',
          'Beautify Selected Range — click two dots on a route to select a range, then smooth only that section.',
          'Wristband Cards — create printable play cards sized for physical wristband holders.',
          'Play Library — browse saved plays, load quickly, and print or export a playbook PDF.',
          'Collapsible Play Setup — Formation, Play, Drawing Mode, and Play Actions sections collapse to give the field more room.',
          'Team sharing — invite coaches and players to your team so everyone works from the same saved plays.',
        ],
      },
    ],
  },
  {
    id: 'quick-start',
    title: 'Quick Start',
    defaultOpen: true,
    blocks: [
      {
        type: 'paragraph',
        text: 'Follow this workflow to enter a play from scratch:',
      },
      {
        type: 'list',
        items: [
          'Choose a formation in Play Setup (left panel).',
          'Enter a play name and optional categories in Play Information.',
          'Select Route, Motion, or Blocking in Drawing Mode.',
          'Click a player on the field, then click and drag to draw.',
          'Add player assignments and play notes as needed.',
          'Click Save Changes or Save As New Play.',
          'Use Mirror Play to flip the play to the other side.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Tip: collapse sidebar sections you are not using so the field stays large while you draw.',
      },
    ],
  },
  {
    id: 'drawing-routes',
    title: 'Drawing Routes',
    blocks: [
      {
        type: 'paragraph',
        text: 'Routes show where a player runs after the snap. Offensive routes are white lines with an arrow at the endpoint.',
      },
      {
        type: 'list',
        items: [
          'Set Drawing Mode to Route.',
          'Click a player (quick click, not drag) to select them.',
          'Click and drag on the field to draw the route path.',
          'Release the mouse to finish the route.',
          'Drag the endpoint handle to reshape or extend the route.',
          'Right-click a route for delete segment, delete entire route, or beautify options.',
          'Click two interior dots to select a beautify range, then use Beautify Selected Range.',
        ],
      },
    ],
  },
  {
    id: 'drawing-motion',
    title: 'Drawing Motion',
    blocks: [
      {
        type: 'paragraph',
        text: 'Motion paths show pre-snap movement. Motions use a filled circle endpoint marker instead of an arrow.',
      },
      {
        type: 'list',
        items: [
          'Set Drawing Mode to Motion.',
          'Choose Jog or Sprint before drawing.',
          'Click a player, then drag on the field to draw the motion path.',
          'Jog motions appear in gold; sprint motions appear in green.',
          'Edit, delete, and beautify motions the same way as routes.',
        ],
      },
    ],
  },
  {
    id: 'drawing-blocking',
    title: 'Drawing Blocking',
    blocks: [
      {
        type: 'paragraph',
        text: 'Blocking assignments show who a player blocks. Blocks are orange lines with a T-cap at the endpoint.',
      },
      {
        type: 'list',
        items: [
          'Set Drawing Mode to Blocking.',
          'Click a player, then drag toward the block target area.',
          'Blocks are stored separately from routes and motions.',
          'Right-click for delete segment, delete entire block, or beautify.',
        ],
      },
    ],
  },
  {
    id: 'defense-movement',
    title: 'Defense Movement',
    blocks: [
      {
        type: 'paragraph',
        text: 'On defensive plays, defenders can have movement paths showing post-snap responsibilities.',
      },
      {
        type: 'list',
        items: [
          'Switch the play type to Defense in the header.',
          'Choose a defensive front and place defenders.',
          'Set Drawing Mode to Movement (labeled Route on defense).',
          'Click a defender, then drag to draw the movement path.',
          'Use the same segment delete and beautify tools as offensive routes.',
        ],
      },
    ],
  },
  {
    id: 'action-chains',
    title: 'Action Chains',
    blocks: [
      {
        type: 'paragraph',
        text: 'Each offensive player can have multiple ordered actions chained together: route, motion, and block.',
      },
      {
        type: 'list',
        items: [
          'The first action starts at the player position.',
          'Each new action automatically starts at the previous action endpoint.',
          'Change Drawing Mode to add the next action type to the chain.',
          'Actions render in order on the field.',
          'Existing single-route plays load as a one-action chain.',
          'Save and load preserves the full chain for each player.',
        ],
      },
    ],
  },
  {
    id: 'playbooks',
    title: 'Playbooks',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Play Library lets you browse, load, and print your saved plays as a playbook.',
      },
      {
        type: 'list',
        items: [
          'Open Play Library from the left panel Play Library section.',
          'Filter by offense, defense, or both.',
          'Choose a grid layout (1, 2, 4, or 6 plays per page).',
          'Click a thumbnail to load that play into the designer.',
          'Print Playbook opens the system print dialog.',
          'Save as PDF opens the print dialog — choose Save as PDF, then attach the file to your email.',
          'Email PDF uses the same print layout and opens a mail draft after saving.',
        ],
      },
    ],
  },
  {
    id: 'wristband-cards',
    title: 'Wristband Cards',
    blocks: [
      {
        type: 'paragraph',
        text: 'Wristband Cards create printable play lists sized for physical wristband holders.',
      },
      {
        type: 'list',
        items: [
          'Open Wristband Cards from the header navigation.',
          'Create a card template with name, width, and height in inches.',
          'Add left and right column headings and select plays for each column.',
          'Reorder plays with the up/down controls.',
          'Preview the card face before printing.',
          'Print on 8.5 x 11 paper, cut out cards, and insert into wristband holders.',
          'Team owners and coaches can create and edit; players and parents can view and print.',
        ],
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing',
    blocks: [
      {
        type: 'paragraph',
        text: 'Plays and team resources are shared through your team workspace.',
      },
      {
        type: 'list',
        items: [
          'Team owners can invite members with the Invite button in the header.',
          'Invited coaches can create and edit plays for the team.',
          'Players and parents can view plays and print wristband cards.',
          'Saved plays sync to the cloud when you are signed in with a team selected.',
          'Export a playbook PDF from Play Library to share outside the app.',
          'Use Report Issue / Enhancement in the header to send feedback to the development team.',
        ],
      },
    ],
  },
  {
    id: 'common-questions',
    title: 'Common Questions',
    blocks: [
      {
        type: 'list',
        items: [
          'Why will a player not select? — Click directly on the player icon. If players are close together, the nearest player is selected.',
          'How do I delete one segment of a route? — Right-click the route and choose Delete Segment, or select a segment and press Delete.',
          'How do I smooth a rough route? — Click two dots on the route to select a range, then click Beautify Selected Range.',
          'Why did my play not save? — Make sure you clicked Save Changes. Use Save As New Play for a copy with a new name.',
          'How do I flip a play to the other side? — Click Mirror Play in Play Actions. Routes, blocks, motions, and assignments mirror around center.',
          'Can I use custom formations? — Yes. Drag players into position, then click Save Current Formation in Play Setup.',
          'Where are wristband cards? — Use the Wristband Cards link in the header next to Play Designer.',
        ],
      },
    ],
  },
]
