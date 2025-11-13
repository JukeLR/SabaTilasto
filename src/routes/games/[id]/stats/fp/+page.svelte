<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let maalivahti = { label: "Maalivahti", text: "Maalivahti", id: null, editing: false };
  let editingGoalie = false;
  let kentat = [
    { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
    { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
    { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
    { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] }
  ];
  let fieldPositions: number[] = [];
  let lineup: number[] = [];
  let pelaajaNimet: Record<number, string> = {};
  let pollingInterval: any;
  let initialFieldPositions: number[] = [];
  let isDirty = false;
  let ownTeamId: number | null = null;
  let opponentName: string = "";

  async function fetchNimet() {
    const id = $page.params.id;
    const res = await fetch(`/api/games/${id}?basic=true`);
    const data = await res.json();
    const newFieldPositions = data.fieldPositions || [];
    lineup = data.lineup || [];
    pelaajaNimet = {};
    ownTeamId = data.own_team_id || null;
    opponentName = data.opponentName || "";
    for (const pid of lineup) {
      if (!pid) continue;
      const pres = await fetch(`/api/players/${pid}`);
      const pdata = await pres.json();
      pelaajaNimet[pid] = pdata.nick || "";
    }
    // Päivitä vain jos ei muokata paikkoja
    if (!isDirty) {
      fieldPositions = [...newFieldPositions];
      initialFieldPositions = [...newFieldPositions];
      maalivahti.id = fieldPositions[0] || null;
      maalivahti.text = maalivahti.id !== null && pelaajaNimet[maalivahti.id] ? pelaajaNimet[maalivahti.id] : 'Maalivahti';
      maalivahti.editing = false;
      let i = 1;
      for (let k = 0; k < kentat.length; k++) {
        for (let j = 0; j < kentat[k].yla.length; j++) {
          kentat[k].yla[j].id = fieldPositions[i] || null;
          kentat[k].yla[j].text = pelaajaNimet[fieldPositions[i]] || "";
          kentat[k].yla[j].editing = false;
          i++;
        }
        for (let j = 0; j < kentat[k].ala.length; j++) {
          kentat[k].ala[j].id = fieldPositions[i] || null;
          kentat[k].ala[j].text = pelaajaNimet[fieldPositions[i]] || "";
          kentat[k].ala[j].editing = false;
          i++;
        }
      }
    }
  }

  function startPolling() {
    pollingInterval = setInterval(() => {
      if (!isDirty) fetchNimet();
    }, 3000);
  }
  function stopPolling() {
    clearInterval(pollingInterval);
  }

  onMount(() => {
    fetchNimet();
    startPolling();
    return stopPolling;
  });

  function goBack() {
    // Peruuta: palauta alkuperäiset kentälliset ja siirry stats-sivulle
    fieldPositions = [...initialFieldPositions];
    isDirty = false;
    const unsubscribe = page.subscribe(($page) => {
      goto(`/games/${$page.params.id}/stats`);
    });
    unsubscribe();
  }

  async function saveFieldPositions() {
    const id = $page.params.id;
    await fetch(`/api/games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldPositions,
        ownTeamId,
        opponentName,
        lineup // lisätty
      })
    });
    isDirty = false;
    goBack();
  }

  function editPlayer(kenttaIdx: number, paikka: 'yla' | 'ala', pelaajaIdx: number) {
    kentat[kenttaIdx][paikka][pelaajaIdx].editing = true;
    kentat[kenttaIdx][paikka][pelaajaIdx].text = "";
    kentat[kenttaIdx][paikka][pelaajaIdx].id = null;
    // Päivitä fieldPositions
    let flat = [maalivahti.id];
    for (let k = 0; k < kentat.length; k++) {
      for (let j = 0; j < kentat[k].yla.length; j++) {
        flat.push(kentat[k].yla[j].id);
      }
      for (let j = 0; j < kentat[k].ala.length; j++) {
        flat.push(kentat[k].ala[j].id);
      }
    }
    fieldPositions = flat;
    isDirty = true;
  }

  function editGoalie() {
    editingGoalie = true;
    maalivahti.editing = true;
    maalivahti.text = "";
    maalivahti.id = null;
    isDirty = true;
  }

  function selectPlayer(kenttaIdx: number, paikka: 'yla' | 'ala', pelaajaIdx: number, uusiId: number) {
    kentat[kenttaIdx][paikka][pelaajaIdx].id = uusiId;
    kentat[kenttaIdx][paikka][pelaajaIdx].text = pelaajaNimet[uusiId] || '';
    kentat[kenttaIdx][paikka][pelaajaIdx].editing = false;
    // Päivitä fieldPositions
    let flat = [maalivahti.id];
    for (let k = 0; k < kentat.length; k++) {
      for (let j = 0; j < kentat[k].yla.length; j++) {
        flat.push(kentat[k].yla[j].id);
      }
      for (let j = 0; j < kentat[k].ala.length; j++) {
        flat.push(kentat[k].ala[j].id);
      }
    }
    fieldPositions = flat;
    isDirty = true;
  }

  function selectGoalie(uusiId: number) {
    maalivahti.id = uusiId;
    maalivahti.text = pelaajaNimet[uusiId] || '';
    maalivahti.editing = false;
    editingGoalie = false;
    // Päivitä fieldPositions
    let flat = [maalivahti.id];
    for (let k = 0; k < kentat.length; k++) {
      for (let j = 0; j < kentat[k].yla.length; j++) {
        flat.push(kentat[k].yla[j].id);
      }
      for (let j = 0; j < kentat[k].ala.length; j++) {
        flat.push(kentat[k].ala[j].id);
      }
    }
    fieldPositions = flat;
    isDirty = true;
  }
</script>

<main class="fp-main">
  <h2>Kentälliset</h2>
  <div class="fp-grid fp-row-maalivahti">
    <div class="fp-col">
      {#if maalivahti.editing}
        <select class="fp-btn" on:change={(e) => selectGoalie(+e.target.value)}>
          <option value="">Valitse maalivahti</option>
          {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
            <option value={pid}>{pelaajaNimet[pid]}</option>
          {/each}
        </select>
      {:else}
        <button class="fp-btn" on:click={editGoalie}>{maalivahti.text}</button>
      {/if}
    </div>
  </div>
  {#each kentat as kentta, i}
    <div class="fp-kentta">
      <div class="fp-kentta-title">{i + 1}. kenttä</div>
      <div class="fp-grid fp-row-yla">
        {#each kentta.yla as pelaaja, j}
          <div class="fp-col">
            {#if pelaaja.editing}
              <select class="fp-btn" on:change={(e) => selectPlayer(i, 'yla', j, +e.target.value)}>
                <option value="">Valitse pelaaja</option>
                {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
                  <option value={pid}>{pelaajaNimet[pid]}</option>
                {/each}
              </select>
            {:else}
              <button class="fp-btn" on:click={() => pelaaja.text && editPlayer(i, 'yla', j)}>{pelaaja.text}</button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="fp-grid fp-row-ala">
        {#each kentta.ala as pelaaja, j}
          <div class="fp-col">
            {#if pelaaja.editing}
              <select class="fp-btn" on:change={(e) => selectPlayer(i, 'ala', j, +e.target.value)}>
                <option value="">Valitse pelaaja</option>
                {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
                  <option value={pid}>{pelaajaNimet[pid]}</option>
                {/each}
              </select>
            {:else}
              <button class="fp-btn" on:click={() => pelaaja.text && editPlayer(i, 'ala', j)}>{pelaaja.text}</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
  <div class="fp-grid fp-actions">
    <div class="fp-col">
      <button class="fp-btn fp-cancel" on:click={goBack}>Peruuta</button>
    </div>
    <div class="fp-col">
      <button class="fp-btn fp-save" on:click={saveFieldPositions}>Tallenna</button>
    </div>
  </div>

<style>
  .fp-main {
    padding: 1rem;
    max-width: 400px;
    margin: 0 auto;
  }
  .fp-row-maalivahti {
    margin-top: 24px;
    margin-bottom: 24px;
  }
  .fp-btn {
    background: #56a0e3;
    color: #222;
    border: none;
    border-radius: 10px;
    padding: 0;
    min-width: 80px;
    height: 24px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
      goto(`/games/${id}/stats`);
    }
    height: 28px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
  }
  .fp-label {
    font-size: 0.85rem;
    color: #222;
    margin-bottom: 2px;
    font-weight: 500;
  }
  .fp-btn {
    background: #56a0e3;
    color: black !important;
    border: none;
    border-radius: 12px;
    padding: 16px 0;
    min-width: 120px;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    transition: background 0.2s;
  }
  .fp-btn:active {
    background: #357ab8;
  }
  .fp-actions {
    gap: 24px;
    margin-top: 32px;
  }
  .fp-cancel {
    background: #999;
  }
  .fp-save {
    background: #56a0e3;
  }
</style>
  <!-- Peruuta/Tallenna napit ovat jo mainin sisällä, poistetaan duplikaatti -->
</main>

<style>
.fp-main {
  padding: 1rem;
  max-width: 400px;
  margin: 0 auto;
}
.fp-row-maalivahti {
  margin-top: 24px;
  margin-bottom: 24px;
}
.fp-kentta {
  margin-bottom: 24px;
}
.fp-grid {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16px;
}
.fp-row-yla {
  margin-bottom: 8px;
}
.fp-row-ala {
  margin-bottom: 0;
}
.fp-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.fp-label {
  font-size: 1rem;
  color: #222;
  margin-bottom: 4px;
  font-weight: 500;
}
.fp-btn {
  background: #56a0e3;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 0;
  min-width: 120px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  transition: background 0.2s;
}
.fp-btn:active {
  background: #357ab8;
}
.fp-actions {
  gap: 24px;
  margin-top: 32px;
}
.fp-cancel {
  background: #999;
}
.fp-save {
  background: #56a0e3;
}
</style>
