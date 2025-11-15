<script>
  let stats = {
    ownGoal: 0,
    oppGoal: 0,
    shotOnGoal: 0,
    shotMissed: 0,
    shotBlocked: 0,
    oppShotBlocked: 0,
    oppShotMissed: 0,
    save: 0,
    goalieBreak: 0
  };
</script>
<main>
  <h1 style="text-align:center;margin-top:2rem;">SabaTilastot</h1>
  <div style="text-align:center;margin-top:2rem;">
    <a href="/register" style="font-weight:bold;color:#357ab8;text-decoration:underline;font-size:1.2rem;">Luo uusi käyttäjä</a>
  </div>
  <div class="stats-buttons">
    <div class="row wide-row">
      <div class="col">
        <div class="label">Maali meille</div>
        <button class="btn btn-green wide-btn" on:click={() => stats.ownGoal++}>{stats.ownGoal}</button>
      </div>
      <div class="col">
        <div class="label">Maali vastustajalle</div>
        <button class="btn btn-orange wide-btn" on:click={() => stats.oppGoal++}>{stats.oppGoal}</button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="label">Veto maalia<br/>kohti</div>
        <button class="btn btn-green" on:click={() => stats.shotOnGoal++}>{stats.shotOnGoal}</button>
      </div>
      <div class="col">
        <div class="label">Veto ohi<br/>maalin</div>
        <button class="btn btn-yellow" on:click={() => stats.shotMissed++}>{stats.shotMissed}</button>
      </div>
      <div class="col">
        <div class="label">Veto<br/>blokkiin</div>
        <button class="btn btn-yellow" on:click={() => stats.shotBlocked++}>{stats.shotBlocked}</button>
      </div>
    </div>
    <div class="row wide-row">
      <div class="col">
        <div class="label">Vastustajan veto<br/>blokattu</div>
        <button class="btn btn-green wide-btn" on:click={() => stats.oppShotBlocked++}>{stats.oppShotBlocked}</button>
      </div>
      <div class="col">
        <div class="label">Vastustajan veto ohi<br/>maalin</div>
        <button class="btn btn-yellow wide-btn" on:click={() => stats.oppShotMissed++}>{stats.oppShotMissed}</button>
      </div>
    </div>
    <div class="row wide-row">
      <div class="col">
        <div class="label">Torjunta</div>
        <button class="btn btn-green wide-btn" on:click={() => stats.save++}>{stats.save}</button>
      </div>
      <div class="col">
        <div class="label">Maalivahdin katko</div>
        <button class="btn btn-green wide-btn" on:click={() => stats.goalieBreak++}>{stats.goalieBreak}</button>
      </div>
    </div>
  </div>
</main>

<style>
.stats-buttons {
  margin: 2rem auto;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 10px;
}
.wide-row .btn {
  width: 180px;
}
.wide-btn {
  width: 180px;
}
.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.label {
  font-size: 1rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 6px;
  text-align: center;
}
.btn {
  width: 120px;
  height: 60px;
  font-size: 2rem;
  font-weight: bold;
  border-radius: 18px;
  border: none;
  margin-bottom: 0.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #222;
  touch-action: manipulation;
}
.btn-green {
  background: #4caf50;
}
.btn-orange {
  background: #ff9800;
}
.btn-yellow {
  background: #ffd54f;
}
</style>
