const userForm = document.getElementById("userForm");
const usernameInput = document.getElementById("usernameInput");
const battleTagInput = document.getElementById("battleTagInput");
const rankSelect = document.getElementById("rankSelect");
const vcToggle = document.getElementById("vcToggle");
const teamSelect = document.getElementById("teamSelect");
const statusMessage = document.getElementById("statusMessage");
const teamsContainer = document.getElementById("teamsContainer");
const reserveList = document.getElementById("reserveList");
const reserveCount = document.getElementById("reserveCount");
const reserveEmpty = document.getElementById("reserveEmpty");
const emptyState = document.getElementById("emptyState");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const matchTableBody = document.getElementById("matchTableBody");
const matchCountLabel = document.getElementById("matchCount");
const addMatchButton = document.getElementById("addMatchButton");

const TEAM_SIZE = 5;
const INITIAL_TEAMS = 4;
const INITIAL_RESERVE = 5;
const teams = Array.from({ length: INITIAL_TEAMS }, () => Array.from({ length: TEAM_SIZE }, () => null));
const teamNames = Array.from({ length: INITIAL_TEAMS }, (_, i) => `チーム ${i + 1}`);
const reserveSlots = Array.from({ length: INITIAL_RESERVE }, () => null);
let dragSource = null;
let userTooltip = null;
let userTooltipTimeout = null;

function getTeamCount() {
  return teams.length;
}

function ensureTeamCount(count) {
  while (teams.length < count) {
    teams.push(Array.from({ length: TEAM_SIZE }, () => null));
    teamNames.push(`チーム ${teams.length}`);
  }
}

function getFirstEmptySlotInTeam(teamIndex) {
  const team = teams[teamIndex];
  if (!team) {
    return -1;
  }

  return team.findIndex((slot) => slot === null);
}

function findTeamWithSpace(excludeIndex) {
  for (let i = 0; i < teams.length; i += 1) {
    if (i === excludeIndex) {
      continue;
    }
    if (teams[i].some((slot) => slot === null)) {
      return i;
    }
  }
  return -1;
}

function getFirstEmptyReserveSlot() {
  return reserveSlots.findIndex((slot) => slot === null);
}

function addTeam() {
  const nextCount = getTeamCount() + 1;
  ensureTeamCount(nextCount);
  setStatus(`新しいチーム「チーム ${nextCount}」を追加しました。`);
  renderList();
  teamSelect.value = `team-${nextCount - 1}`;
}

function updateTeamSelectOptions() {
  teamSelect.innerHTML = "";
  teams.forEach((_, index) => {
    const option = document.createElement("option");
    option.value = `team-${index}`;
    option.textContent = teamNames[index] || `チーム ${index + 1}`;
    teamSelect.appendChild(option);
  });

  const reserveOption = document.createElement("option");
  reserveOption.value = "reserve";
  reserveOption.textContent = "リザーブ";
  teamSelect.appendChild(reserveOption);
}

const rankColors = {
  ブロンズ: "#b87333",
  シルバー: "#c0c0c0",
  ゴールド: "#ffd700",
  プラチナ: "#6fc7ff",
  ダイヤ: "#5d9cff",
  マスター: "#2ac725",
  グランドマスター: "#6c12d3",
  チャンピオン: "#9f68c4"
};

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
}

const matchRows = [];
const heroRoleOptions = [
  {
    role: "タンク",
    heroes: ["ラインハルト", "オリーサ", "ザリア", "ロードホッグ", "ウィンストン", "D.Va", "シグマ", "レッキングボール"]
  },
  {
    role: "ダメージ",
    heroes: ["ソルジャー:76", "トレーサー", "リーパー", "ウィドウメイカー", "ハンゾー", "ジャンクラット", "アッシュ", "シンメトラ", "ソンブラ", "ファラ", "バスティオン", "メイ"]
  },
  {
    role: "サポート",
    heroes: ["マーシー", "ルシオ", "モイラ", "バティスト", "ゼニヤッタ", "アナ", "ブリギッテ"]
  }
];

function switchTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === `${tabId}-tab`);
  });
}

function updateMatchCount() {
  if (matchCountLabel) {
    matchCountLabel.textContent = String(matchRows.length);
  }
}

function addMatchRow() {
  const defaultA = 0;
  const defaultB = teams.length > 1 ? 1 : 0;
  matchRows.push({
    rounds: [{ teamA: defaultA, teamB: defaultB }],
    tests: {
      left1: heroRoleOptions[0].heroes[0],
      center1: heroRoleOptions[1].heroes[0],
      center2: heroRoleOptions[1].heroes[1],
      right1: heroRoleOptions[2].heroes[0]
    }
  });
  updateMatchCount();
  renderMatchTable();
}

function renderMatchTable() {
  if (!matchTableBody) {
    return;
  }

  matchTableBody.innerHTML = "";
  if (matchRows.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="4" class="no-matches">試合を追加してください。</td>`;
    matchTableBody.appendChild(emptyRow);
    return;
  }

  const options = teams
    .map((_, index) => `<option value="${index}">${teamNames[index] || `チーム ${index + 1}`}</option>`)
    .join("");

  matchRows.forEach((match, matchIndex) => {
    match.rounds.forEach((round, roundIndex) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${roundIndex === 0 ? matchIndex + 1 : ""}</td>
        <td>
          <div class="team-cell">
            <select data-match-index="${matchIndex}" data-round-index="${roundIndex}" name="teamA">${options}</select>
            <button type="button" class="member-btn" data-match-index="${matchIndex}" data-round-index="${roundIndex}" data-side="A" aria-label="メンバー表示">メンバー</button>
          </div>
        </td>
        <td>
          <div class="team-cell">
            <select data-match-index="${matchIndex}" data-round-index="${roundIndex}" name="teamB">${options}</select>
            <button type="button" class="member-btn" data-match-index="${matchIndex}" data-round-index="${roundIndex}" data-side="B" aria-label="メンバー表示">メンバー</button>
          </div>
        </td>
        <td>
          <button type="button" class="add-round-button" data-match-index="${matchIndex}" data-round-index="${roundIndex}">追加</button>
          <button type="button" class="delete-round-button" data-match-index="${matchIndex}" data-round-index="${roundIndex}">削除</button>
        </td>
      `;

      const selects = row.querySelectorAll("select");
      selects.forEach((select) => {
        const field = select.name;
        const matchIndex = Number(select.dataset.matchIndex);
        const roundIndex = Number(select.dataset.roundIndex);
        select.value = String(matchRows[matchIndex].rounds[roundIndex][field]);
        select.addEventListener("change", (event) => {
          const target = event.currentTarget;
          const matchIndex = Number(target.dataset.matchIndex);
          const roundIndex = Number(target.dataset.roundIndex);
          matchRows[matchIndex].rounds[roundIndex][field] = Number(target.value);
        });
      });

      const deleteButton = row.querySelector(".delete-round-button");
      deleteButton.addEventListener("click", () => {
        const matchIndex = Number(deleteButton.dataset.matchIndex);
        const roundIndex = Number(deleteButton.dataset.roundIndex);
        if (matchRows[matchIndex].rounds.length > 1) {
          matchRows[matchIndex].rounds.splice(roundIndex, 1);
        } else {
          matchRows.splice(matchIndex, 1);
          updateMatchCount();
        }
        renderMatchTable();
      });

      const addRoundButton = row.querySelector(".add-round-button");
      addRoundButton.addEventListener("click", () => {
        const matchIndex = Number(addRoundButton.dataset.matchIndex);
        const roundIndex = Number(addRoundButton.dataset.roundIndex);
        const currentRound = matchRows[matchIndex].rounds[roundIndex];
        const newRound = { teamA: currentRound.teamA, teamB: currentRound.teamB };
        matchRows[matchIndex].rounds.splice(roundIndex + 1, 0, newRound);
        renderMatchTable();
      });

      const memberButtons = row.querySelectorAll('.member-btn');
      memberButtons.forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          clearMemberPopupTimeout();
          const side = btn.dataset.side;
          const select = row.querySelector(`select[name="team${side}"]`);
          const teamIndex = select ? Number(select.value) : null;
          showMemberPopup(teamIndex, btn);
        });
        btn.addEventListener('mouseleave', () => {
          clearMemberPopupTimeout();
          memberPopupTimeout = setTimeout(() => {
            if (!memberPopup || !memberPopup.matches(':hover')) {
              hideMemberPopup();
            }
            memberPopupTimeout = null;
          }, 100);
        });
      });

      matchTableBody.appendChild(row);
    });

    const detailsRow = document.createElement("tr");
    const heroOptions = heroRoleOptions
      .map((group) => `
        <optgroup label="${group.role}">
          ${group.heroes.map((hero) => `<option value="${hero}">${hero}</option>`).join("")}
        </optgroup>
      `)
      .join("");
    detailsRow.innerHTML = `
      <td>
        <div class="ban-cell">
          <span class="ban-label">BAN枠</span>
        </div>
      </td>
      <td>
        <div class="tests-group">
          <label class="position-label">左1<select data-match-index="${matchIndex}" name="left1">${heroOptions}</select></label>
          <label class="position-label">中央1<select data-match-index="${matchIndex}" name="center1">${heroOptions}</select></label>
        </div>
      </td>
      <td>
        <div class="tests-group">
          <label class="position-label">中央2<select data-match-index="${matchIndex}" name="center2">${heroOptions}</select></label>
          <label class="position-label">右1<select data-match-index="${matchIndex}" name="right1">${heroOptions}</select></label>
        </div>
      </td>
      <td></td>
    `;

    const left1 = detailsRow.querySelector('select[name="left1"]');
    const center1 = detailsRow.querySelector('select[name="center1"]');
    const center2 = detailsRow.querySelector('select[name="center2"]');
    const right1 = detailsRow.querySelector('select[name="right1"]');

    if (left1) {
      left1.value = String(match.tests.left1);
      left1.addEventListener('change', (e) => {
        const matchIndex = Number(e.currentTarget.dataset.matchIndex);
        matchRows[matchIndex].tests.left1 = e.currentTarget.value;
      });
    }
    if (center1) {
      center1.value = String(match.tests.center1);
      center1.addEventListener('change', (e) => {
        const matchIndex = Number(e.currentTarget.dataset.matchIndex);
        matchRows[matchIndex].tests.center1 = e.currentTarget.value;
      });
    }
    if (center2) {
      center2.value = String(match.tests.center2);
      center2.addEventListener('change', (e) => {
        const matchIndex = Number(e.currentTarget.dataset.matchIndex);
        matchRows[matchIndex].tests.center2 = e.currentTarget.value;
      });
    }
    if (right1) {
      right1.value = String(match.tests.right1);
      right1.addEventListener('change', (e) => {
        const matchIndex = Number(e.currentTarget.dataset.matchIndex);
        matchRows[matchIndex].tests.right1 = e.currentTarget.value;
      });
    }

    matchTableBody.appendChild(detailsRow);
  });
}

let memberPopup = null;
let memberPopupTimeout = null;
function clearMemberPopupTimeout() {
  if (memberPopupTimeout !== null) {
    clearTimeout(memberPopupTimeout);
    memberPopupTimeout = null;
  }
}

function showMemberPopup(teamIndex, anchor) {
  hideMemberPopup();
  clearMemberPopupTimeout();

  if (teamIndex === null || teamIndex === undefined || teamIndex < 0 || teamIndex >= teams.length) {
    memberPopup = document.createElement('div');
    memberPopup.className = 'member-popup';
    memberPopup.textContent = 'チームがありません';
    document.body.appendChild(memberPopup);
  } else {
    const members = teams[teamIndex].filter((m) => m !== null);
    memberPopup = document.createElement('div');
    memberPopup.className = 'member-popup';
    if (members.length === 0) {
      memberPopup.textContent = 'メンバーがいません';
    } else {
      const ul = document.createElement('ul');
      ul.className = 'member-list-popup';
      members.forEach((m) => {
        const li = document.createElement('li');
        li.textContent = typeof m === 'string' ? m : m.name || '名無し';
        ul.appendChild(li);
      });
      memberPopup.appendChild(ul);
    }
    document.body.appendChild(memberPopup);
  }

  const rect = anchor.getBoundingClientRect();
  memberPopup.style.position = 'absolute';
  memberPopup.style.left = `${rect.right + 8 + window.scrollX}px`;
  memberPopup.style.top = `${rect.top + window.scrollY}px`;
  memberPopup.addEventListener('mouseenter', clearMemberPopupTimeout);
  memberPopup.addEventListener('mouseleave', hideMemberPopup);
}

function hideMemberPopup() {
  clearMemberPopupTimeout();
  if (memberPopup && memberPopup.parentElement) {
    memberPopup.parentElement.removeChild(memberPopup);
    memberPopup = null;
  }
}

function clearUserTooltipTimeout() {
  if (userTooltipTimeout !== null) {
    clearTimeout(userTooltipTimeout);
    userTooltipTimeout = null;
  }
}

function hideUserTooltip() {
  clearUserTooltipTimeout();
  if (userTooltip && userTooltip.parentElement) {
    userTooltip.parentElement.removeChild(userTooltip);
    userTooltip = null;
  }
}

function showUserTooltip(user, anchor) {
  hideUserTooltip();
  clearUserTooltipTimeout();

  const tooltip = document.createElement("div");
  tooltip.className = "user-tooltip";
  tooltip.innerHTML = `
    <span class="tooltip-text">${user.rank} | VC: </span>
    <span class="tooltip-vc">${user.vc ? "◯" : "✕"}</span>
  `;
  document.body.appendChild(tooltip);

  const rect = anchor.getBoundingClientRect();
  tooltip.style.position = "absolute";
  tooltip.style.left = `${rect.right + 16 + window.scrollX}px`;
  tooltip.style.top = `${rect.top + window.scrollY}px`;
  tooltip.style.zIndex = "1000";
  userTooltip = tooltip;
}

function setStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.style.color = isError ? "#d43f3a" : "#1c3d78";
}

function createUserItem(name, location) {
  const user = typeof name === "string" ? { name, rank: "ブロンズ", vc: false } : name;
  const item = document.createElement("li");
  item.className = location.type === "reserve" ? "reserve-item" : "user-item";
  item.draggable = true;
  item.dataset.type = location.type;
  item.dataset.teamIndex = location.teamIndex ?? "";
  item.dataset.slotIndex = location.slotIndex;
  const rgb = hexToRgb(rankColors[user.rank] || "#eef3ff");
  item.style.setProperty("--rank-color-rgb", rgb);
  item.style.setProperty("--vc-color", user.vc ? "#1ebc5a" : "#e14d4d");
  item.innerHTML = `
    <span class="user-name">${user.name}</span>
    <button type="button" class="delete-button" data-type="${location.type}" data-team-index="${location.teamIndex ?? ""}" data-slot-index="${location.slotIndex}">削除</button>
  `;

  item.addEventListener("mouseenter", () => {
    clearUserTooltipTimeout();
    showUserTooltip(user, item);
  });

  item.addEventListener("mouseleave", () => {
    clearUserTooltipTimeout();
    userTooltipTimeout = setTimeout(() => {
      if (!userTooltip || !userTooltip.matches(":hover")) {
        hideUserTooltip();
      }
      userTooltipTimeout = null;
    }, 100);
  });

  item.addEventListener("dragstart", (event) => {
    dragSource = { ...location };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(dragSource));
    event.currentTarget.classList.add("dragging");
  });

  item.addEventListener("dragend", (event) => {
    event.currentTarget.classList.remove("dragging");
    clearDragOverStates();
  });

  item.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  item.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = {
      type: event.currentTarget.dataset.type,
      teamIndex: event.currentTarget.dataset.teamIndex === "" ? null : Number(event.currentTarget.dataset.teamIndex),
      slotIndex: Number(event.currentTarget.dataset.slotIndex),
    };
    moveUser(dragSource, target);
  });

  return item;
}

function createEmptySlot(location) {
  const item = document.createElement("li");
  item.className = location.type === "reserve" ? "reserve-empty" : "empty-slot";
  item.dataset.type = location.type;
  item.dataset.teamIndex = location.teamIndex ?? "";
  item.dataset.slotIndex = location.slotIndex;
  item.textContent = location.type === "reserve" ? "リザーブ空き" : "空きスロット";

  item.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    item.classList.add("drag-over");
  });

  item.addEventListener("dragleave", () => {
    item.classList.remove("drag-over");
  });

  item.addEventListener("drop", (event) => {
    event.preventDefault();
    item.classList.remove("drag-over");
    const target = {
      type: event.currentTarget.dataset.type,
      teamIndex: event.currentTarget.dataset.teamIndex === "" ? null : Number(event.currentTarget.dataset.teamIndex),
      slotIndex: Number(event.currentTarget.dataset.slotIndex),
    };
    moveUser(dragSource, target);
  });

  return item;
}

function clearDragOverStates() {
  document.querySelectorAll(
    ".team-card.drag-over, .empty-slot.drag-over, .reserve-empty.drag-over, .reserve-list.drag-over, .reserve-card.drag-over"
  ).forEach((element) => {
    element.classList.remove("drag-over");
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

// Enable dropping onto the reserve list (right panel)
if (reserveList) {
  reserveList.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    reserveList.classList.add("drag-over");
  });

  reserveList.addEventListener("dragleave", () => {
    reserveList.classList.remove("drag-over");
  });

  reserveList.addEventListener("drop", (event) => {
    event.preventDefault();
    reserveList.classList.remove("drag-over");
    const firstEmpty = getFirstEmptyReserveSlot();
    let slotIndex = firstEmpty;
    if (slotIndex === -1) {
      reserveSlots.push(null);
      slotIndex = reserveSlots.length - 1;
    }
    moveUser(dragSource, { type: "reserve", slotIndex });
  });
}

// Also allow dropping onto the reserve card container
const reserveCard = document.querySelector('.reserve-card');
if (reserveCard) {
  reserveCard.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    reserveCard.classList.add('drag-over');
  });

  reserveCard.addEventListener('dragleave', () => {
    reserveCard.classList.remove('drag-over');
  });

  reserveCard.addEventListener('drop', (event) => {
    event.preventDefault();
    reserveCard.classList.remove('drag-over');
    const firstEmpty = getFirstEmptyReserveSlot();
    let slotIndex = firstEmpty;
    if (slotIndex === -1) {
      reserveSlots.push(null);
      slotIndex = reserveSlots.length - 1;
    }
    moveUser(dragSource, { type: 'reserve', slotIndex });
  });
}

function moveUser(source, target) {
  if (!source || !target) {
    return;
  }

  if (source.type === target.type && source.teamIndex === target.teamIndex && source.slotIndex === target.slotIndex) {
    return;
  }

  const sourceArray = source.type === "reserve" ? reserveSlots : teams[source.teamIndex];
  const targetArray = target.type === "reserve" ? reserveSlots : teams[target.teamIndex];
  if (!sourceArray || !targetArray) {
    return;
  }

  const movedUser = sourceArray[source.slotIndex];
  if (!movedUser) {
    return;
  }

  const destination = targetArray[target.slotIndex];
  sourceArray[source.slotIndex] = destination;
  targetArray[target.slotIndex] = movedUser;

  const movedName = typeof movedUser === 'string' ? movedUser : movedUser.name || 'ユーザー';
  setStatus(`「${movedName}」を移動しました。`);
  renderList();
}

function renderList() {
  teamsContainer.innerHTML = "";
  reserveList.innerHTML = "";

  const reserveCountValue = reserveSlots.filter((slot) => slot !== null).length;
  reserveCount.textContent = reserveCountValue;

  const hasUsers = teams.some((team) => team.some((slot) => slot !== null)) || reserveCountValue > 0;
  if (emptyState) {
    emptyState.style.display = hasUsers ? "none" : "block";
  }
  if (reserveEmpty) {
    reserveEmpty.style.display = reserveCountValue > 0 ? "none" : "block";
  }

  const teamCount = getTeamCount();
  updateTeamSelectOptions();

  for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
    const teamCard = document.createElement("div");
    teamCard.className = "team-card";
    teamCard.innerHTML = `
      <div class="team-title-row">
        <input class="team-name-input" type="text" value="${teamNames[teamIndex] || `チーム ${teamIndex + 1}`}" data-team-index="${teamIndex}" />
      </div>
      <ul class="team-list" data-team-index="${teamIndex}"></ul>
    `;

    const teamList = teamCard.querySelector(".team-list");
    teamCard.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      teamCard.classList.add("drag-over");
    });

    teamCard.addEventListener("dragleave", () => {
      teamCard.classList.remove("drag-over");
    });

    teamCard.addEventListener("drop", (event) => {
      event.preventDefault();
      teamCard.classList.remove("drag-over");
      const firstEmpty = getFirstEmptySlotInTeam(teamIndex);
      if (firstEmpty === -1) {
        return;
      }
      moveUser(dragSource, { type: "team", teamIndex, slotIndex: firstEmpty });
    });

    const teamNameInput = teamCard.querySelector(".team-name-input");
    teamNameInput.addEventListener("input", (event) => {
      const index = Number(event.currentTarget.dataset.teamIndex);
      teamNames[index] = event.currentTarget.value.trim() || `チーム ${index + 1}`;
      updateTeamSelectOptions();
      renderMatchTable();
    });

    teams[teamIndex].forEach((slotValue, slotIndex) => {
      const location = { type: "team", teamIndex, slotIndex };
      const slotItem = slotValue === null ? createEmptySlot(location) : createUserItem(slotValue, location);
      teamList.appendChild(slotItem);
    });

    teamsContainer.appendChild(teamCard);
  }

  reserveSlots.forEach((slotValue, slotIndex) => {
    if (slotValue !== null) {
      const location = { type: "reserve", slotIndex };
      const slotItem = createUserItem(slotValue, location);
      reserveList.appendChild(slotItem);
    }
  });

  renderMatchTable();
}

document.getElementById("addTeamButton").addEventListener("click", () => {
  addTeam();
});

addMatchButton.addEventListener("click", () => {
  addMatchRow();
});

function parseSpreadsheetUserData(text) {
  const normalized = (text || "").replace(/\r/g, "").trim();
  if (!normalized) {
    return null;
  }

  const rows = normalized.split("\n").map((row) => row.trim()).filter((row) => row !== "");
  if (rows.length === 0) {
    return null;
  }

  // Excel copy: vertical (A1/A2) => newline, horizontal (A1/B1) => tab.
  if (rows.length >= 2) {
    return { username: rows[0], battleTag: rows[1] };
  }

  if (rows[0].includes("\t")) {
    const columns = rows[0].split("\t").map((col) => col.trim());
    return { username: columns[0] || "", battleTag: columns[1] || "" };
  }

  return null;
}

function bindSpreadsheetPaste() {
  if (!usernameInput || !battleTagInput) {
    return;
  }

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData("text/plain") || "";
    const parsed = parseSpreadsheetUserData(text);
    if (!parsed) {
      return;
    }

    event.preventDefault();
    usernameInput.value = parsed.username;
    battleTagInput.value = parsed.battleTag;
  };

  usernameInput.addEventListener("paste", handlePaste);
  battleTagInput.addEventListener("paste", handlePaste);
}

bindSpreadsheetPaste();

userForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  if (!username) {
    setStatus("ユーザーネームを入力してください。", true);
    return;
  }

  const selected = teamSelect.value;
  let addedTo = "";

  if (selected === "reserve") {
    let firstEmpty = getFirstEmptyReserveSlot();
    const userData = { name: username, rank: rankSelect.value, vc: vcToggle.checked };
    if (firstEmpty === -1) {
      reserveSlots.push(userData);
      firstEmpty = reserveSlots.length - 1;
    } else {
      reserveSlots[firstEmpty] = userData;
    }
    addedTo = "リザーブ";
  } else {
    const teamIndex = Number(selected.replace("team-", ""));
    ensureTeamCount(teamIndex + 1);

    let firstEmpty = getFirstEmptySlotInTeam(teamIndex);
    if (firstEmpty === -1) {
      const alternateTeam = findTeamWithSpace(teamIndex);
      if (alternateTeam !== -1) {
        firstEmpty = getFirstEmptySlotInTeam(alternateTeam);
        teams[alternateTeam][firstEmpty] = username;
        addedTo = `チーム ${alternateTeam + 1}`;
        teamSelect.value = `team-${alternateTeam}`;
      } else {
        let reserveEmptySlot = getFirstEmptyReserveSlot();
        if (reserveEmptySlot === -1) {
          reserveSlots.push(null);
          reserveEmptySlot = reserveSlots.length - 1;
        }
        reserveSlots[reserveEmptySlot] = username;
        addedTo = "リザーブ";
        teamSelect.value = "reserve";
      }
    } else {
      teams[teamIndex][firstEmpty] = { name: username, rank: rankSelect.value, vc: vcToggle.checked };
      addedTo = `チーム ${teamIndex + 1}`;
      teamSelect.value = `team-${teamIndex}`;
    }
  }

  usernameInput.value = "";
  if (battleTagInput) battleTagInput.value = "";
  if (rankSelect) rankSelect.value = "ブロンズ";
  if (vcToggle) vcToggle.checked = false;
  setStatus(`「${username}」を ${addedTo} に追加しました。`);
  renderList();
  usernameInput.focus();
});

teamsContainer.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) {
    return;
  }

  const type = button.dataset.type;
  const teamIndex = button.dataset.teamIndex === "" ? null : Number(button.dataset.teamIndex);
  const slotIndex = Number(button.dataset.slotIndex);
  if (type === "reserve") {
    reserveSlots[slotIndex] = null;
  } else if (type === "team") {
    teams[teamIndex][slotIndex] = null;
  }

  const removedName = button.parentElement.querySelector(".user-name")?.textContent || "ユーザー";
  setStatus(`「${removedName}」を削除しました。`);
  renderList();
});

reserveList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) {
    return;
  }

  const slotIndex = Number(button.dataset.slotIndex);
  reserveSlots[slotIndex] = null;
  const removedName = button.parentElement.querySelector(".user-name")?.textContent || "ユーザー";
  setStatus(`「${removedName}」を削除しました。`);
  renderList();
});

renderList();
