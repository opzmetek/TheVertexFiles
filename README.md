# TheVertexFiles
Files for game The Vertex

ai/
  astar.js ->
    #FastAStar
      @find - Finds the best path using A* algorhythm
  enemy_ai.js ->
    #EnemyAI
      @move - Move the enemy using classic slide collision system
    #StaticTargetAI
      @move - Move the enemy using FastAStar
      @recompute - Recomputes the path
  mixins.js ->
    @SpiderMixin
    @FloatingMixin
    @JumperMixin
    @MeeleeMixin
