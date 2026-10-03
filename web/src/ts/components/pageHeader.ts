export type HeaderAction = {
    id: string;
    icon: string;
    label: string;
    primary: boolean;
};

type PageHeaderOptions = {
    kicker: string;
    title: string;
    actions: HeaderAction[];
};

// Builds the header every page starts with: kicker line, title and the main actions on the right.
// Pages look up the action buttons by their id afterwards.
export function createPageHeader({ kicker, title, actions }: PageHeaderOptions): HTMLElement {
    const header = document.createElement("header");
    header.className = "page-header";

    const heading = document.createElement("div");
    heading.className = "page-heading";

    const kickerElement = document.createElement("span");
    kickerElement.className = "page-kicker";
    kickerElement.id = "page-kicker";
    kickerElement.textContent = kicker;

    const titleElement = document.createElement("h1");
    titleElement.className = "page-title";
    titleElement.textContent = title;

    heading.append(kickerElement, titleElement);
    header.appendChild(heading);

    if (actions.length > 0) {
        const actionContainer = document.createElement("div");
        actionContainer.className = "page-actions";

        for (const action of actions) {
            actionContainer.appendChild(createActionButton(action));
        }

        header.appendChild(actionContainer);
    }

    return header;
}

export function createActionButton(action: HeaderAction): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.id = action.id;

    if (action.primary) {
        button.className = "btn btn-primary";
    } else {
        button.className = "btn";
    }

    const icon = document.createElement("i");
    icon.className = `ti ${action.icon}`;

    const label = document.createElement("span");
    label.textContent = action.label;

    button.append(icon, label);
    return button;
}

export function setPageKicker(text: string): void {
    const kicker = document.getElementById("page-kicker");
    if (kicker) {
        kicker.textContent = text;
    }
}
