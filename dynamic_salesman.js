/***
* My implementation of the Traveling Salesman problem
* Constructs a minimum spanning tree of the graph and uses a traversal as its path,
* taking shortcuts when possible
* Contact me at shane.jarvie@gmail.com 
**/
function DynamicSalesman() {
  
  this.get_point = function(point_id) {
    return this.points_by_id[point_id]
  }
  
  this.get_surrounding_points = function(point_id) {
    return _.clone(this.connected_points_by_id[point_id])
  }
  
  
  this.get_dist = function(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  }
  
  
  this.init_graph = function(graph) {
    
    // The graph, as given, isn't very friendly for processing. Let's extract
    // points and arcs so we can do super-fast look ups
    this.points_by_id = {}
    this.connected_points_by_id = {}
    this.graph = graph;
    self = this;
    
    _(graph.points).each(function(p) {
      self.points_by_id[p.id] = p;
      self.connected_points_by_id[p.id] = []
    });
    
    _(graph.arcs).each(function(a) {
      self.connected_points_by_id[a[0]].push( self.get_point(a[1]) )
      self.connected_points_by_id[a[1]].push( self.get_point(a[0]) )
    });
  }
  
  

  this.compute_plan = function(graph, start_point_id) {
    this.init_graph(graph);
    var start_point = this.get_point(start_point_id);
    var complete_path = [];
    var self = this;
    var mst = self.prim(start_point); // the path to take
    var path = [];

    // create adjacency lists of edges
    var lst = {};
    _(mst).each(function(e){
      if(lst[e[0].id] === undefined){
        lst[e[0].id] = [e[1].id];
      }
      else {
        lst[e[0].id].push(e[1].id);
      }
    });

    // traverse tree, marking as you progress
    path = self.dfs_traversal(lst,start_point_id)

    // now, if a shortcut exists, take it instead of the nodes
    var i = 0;
    var visited = {}
    while(i < path.length - 1) {
      var j = i + 1;
      var jump_index = -1;
      visited[path[i].id] = true;
      while(j < path.length && visited[path[j]] == true){
        j += 1;
      }

      // the next nodes have already been visited, look for a shortcut
      if( j > i + 1 ){
        complete_path = complete_path.concat(self.get_path_to_point(path[i], path[j]));
      }
      else {
        complete_path.push(path[i]);
      }
      i = j;
    }

    // Go back to the start
    path = self.get_path_to_point(path[path.length-1], start_point);
    complete_path = complete_path.concat(path)
    
    // We need make sure we just return the IDs 
    a = _(complete_path).map(function(p) {
      return p.id
    });
    
    return a;

  }

  this.dfs_traversal = function(lst, start_point_id){

    // use recursion based dfs approach
    var self = this;
    var result = []

    recurse = function(a) {
      result.push(self.get_point(a));
      l = lst[a];
      arr = lst[a];
      _(lst[a]).each(function(b){
        recurse(b);
        result.push(self.get_point(a));
      });
    }

    recurse(start_point_id);    
    return result;
  }


  this.prim = function(start_point) {
    var self = this;

    // return edges that comprise a minimum spanning tree of the graph
    var result = []; 
    var used = {};  
    
    function findMin() {
      var min = [999999,null, null];
      for (var i in used){
        a = self.get_point(i);
        _(self.get_surrounding_points(a.id)).each(function(b) {
          dist = self.get_dist(a, b);
          if (dist < min[0] && !used[b.id]){
            min = [dist, a, b];
          }
        });
      }
      return [min[1], min[2]];
    }

    // Add edges from start
    used[start_point.id] = true;
    
    var min = findMin();
    while(min[1] != null) {
        result.push(min);
        used[min[1].id] = true;
        min = findMin();
    }
    return result; 
  }

  this.get_closest_unvisited_point = function(start_point) {
    
    // Init 
    var self = this;
    var closest_dist = 9999999;
    var closest_point = null;
    var processed = {}
    var queue = this.get_surrounding_points(start_point.id);
    var max_checks = 10;
    var checks = 0;
    
    // Breadth first search
    while(queue.length > 0) {
      var point = queue.shift();
      if (processed[point.id]) continue;
      if (!self.visited[point.id]) {
        var this_dist = self.get_dist(start_point, point);
        if (this_dist < closest_dist) {
          closest_dist = this_dist;
          closest_point = point;
          if (checks > max_checks) break;
          checks += 1;
        }
      }
      processed[point.id] = true;
      _(this.get_surrounding_points(point.id)).each(function(p) {
        if (!processed[p.id]) queue.push(p);
      })
    }
    
    return closest_point; 
  }


  
  
  this.get_path_to_point = function(start_point, end_point) {

    
    visit_queue = []
    max_hits = 20;
    hits = 0;
    closest_path = [];


    //paths(node) holds node, previous node, total cost of path to node
    paths = {};
    visit_queue.push([start_point, null, 0]);
    while (visit_queue.length > 0){
      a = visit_queue.shift();
      this_point = a[0];
      prev_point = a[1];
      this_dist = a[2];
      if (hits >= max_hits) {
          break;
      }

      //check for either a new path or a better path
      new_points = self.get_surrounding_points(this_point.id)
      _(new_points).each(function(p) {
        dist = self.get_dist(this_point, p);

        if (!paths[p.id]){

          paths[p.id] = [p, this_point, this_dist + dist];


          // first time we've hit destination node
          if (p.id == end_point.id) {
            hits += 1;
          }
          // add node to the search
          visit_queue.push(paths[p.id]);
        }
        // compare this path to the previous best path to the node
        else {
          b = paths[p.id];
          that_point = b[0];
          that_prev = b[1];
          that_dist = b[2];

          // replace path with a better path
          if (this_dist + dist < that_dist) {
            paths[p.id] = [p, this_point, this_dist + dist];
          }

          // if found destination increment and check
          if (p.id == end_point.id) {
            hits += 1;
          }
        }
      });
    }

    // now, check for a path, backtracking to find node list
    if (!paths[end_point.id]){
      throw "Could not compute path from start_point to end_point! " + start_point.id + " -> " + end_point.id;
    }
    else {
      p = paths[end_point.id];
      closest_path.push(p[0]);

      // add nodes in reverse and return path once at starting point
      while (true){
        p = paths[p[1].id];
        closest_path.push(p[0]);
        if(p[0].id == start_point.id){
          return closest_path.reverse();
        }
        
      }
    }
  }  
}
  
  