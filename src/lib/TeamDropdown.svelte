<script lang="ts">
  export let teams: { name: string }[] = [];
  let open = false;
  function toggle() { open = !open; }
</script>

<div class="team-dropdown">
  <button class="team-dropdown-btn" type="button" on:click={toggle}>
    {#if teams && teams.length > 0}
      {teams[0].name}
      {#if teams.length > 1}
        &nbsp;(+{teams.length - 1})
      {/if}
    {:else}
      -
    {/if}
  </button>
  {#if open && teams && teams.length > 1}
    <div class="team-dropdown-list">
      {#each teams as team}
        <span>{team.name}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
.team-dropdown {
  position: relative;
  display: inline-block;
}
.team-dropdown-list {
  position: absolute;
  left: 0;
  top: 100%;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 10;
  min-width: 180px;
  padding: 4px 0;
}
.team-dropdown-list span {
  display: block;
  padding: 6px 16px;
  white-space: nowrap;
}
.team-dropdown-list span:hover {
  background: #f8f9fa;
}
.team-dropdown-btn {
  background: none;
  border: none;
  color: #0074d9;
  cursor: pointer;
  padding: 0;
  font-size: 1em;
  text-align: left;
}
</style>
