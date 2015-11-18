"use strict";

chrome.commands.onCommand.addListener(function(command) {
  if (command == 'launch_options') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    return;
  }

  console.log('Command:', command);
  var tabIndex = commandToNumber(command);

  shortcutToBookmarkNodes(tabIndex);
});

function commandToNumber(commandName) {
  return parseInt(commandName.slice(-1)) - 1; // Because item at 0 position is an Apps button, let's do index non-zero based
}

function shortcutToBookmarkNodes(tabIndex) {
  chrome.bookmarks.getChildren('1', function(array) {
    var bookmark_item = array[tabIndex];
    var url = bookmark_item.url;
    openExistingTab(bookmark_item);
  });
}

function openExistingTab(node) {
    if (node.url) {
        chrome.windows.getCurrent(function(win) {
          chrome.tabs.getAllInWindow(win.id, function(tabs) {
            chrome.tabs.getSelected(function(selected_tab) {
              var start_idx = selected_tab.index;
              for (var i = 0; i < tabs.length; i++) {
                var tab_idx = (i + start_idx + 1);	// - tabs.length * ((i + start_idx + 1) % tabs.length) >> 0;
                var normalized_idx = tab_idx >= tabs.length ? tab_idx - tabs.length : tab_idx
                if (tabs[normalized_idx].url.indexOf(node.url) != -1) {
                    chrome.tabs.update(tabs[normalized_idx].id, { active: true });
                    return;
                }
              }
              createTabsForBookmarkNode(node);
            });
          });
       });
    }
}

function createTabsForBookmarkNode(node) {
    if (node.url)
      chrome.tabs.create({ url: node.url });
//    else if (node.children)	// not sure that we should support that
//      createTabsForBookmarkNodes(node.children);
}


// This section is called by View
function getCommands(callback) {
  chrome.commands.getAll(function(commands) {
    callback(commands.filter(function(cmd) {
      return (cmd.name != 'launch_options');
    }));
  });
}

window.getAllBookmarks = function(callback) {
  var commandToDescriptor = {}

  getCommands(function(commands) {
    var completionCount = 0;
    function completeOneCommand() {
      completionCount++;
      if (completionCount >= commands.length)
        callback(commandToDescriptor);
    }

    commands.forEach(function(command) {
      commandToDescriptor[command.name] = {};
      if (command.shortcut) {
        shortcutToBookmarkNodes(command.shortcut, function (nodes) {
          commandToDescriptor[command.name].shortcut = command.shortcut;
          commandToDescriptor[command.name].bookmarks = nodes;
          completeOneCommand();
        });
      } else {
        completeOneCommand();
      }
    });
  });
}