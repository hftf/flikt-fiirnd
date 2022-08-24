const { createApp, reactive, ref, computed, onMounted } = Vue
createApp({
setup() {
	const ins = ref({})
	const conflicts = computed(() => {
		return ins
	})

	function run() {
		console.log('run')
		console.log(ins.value = myrun())
	}
	function formatWord() {
		return myformatWord(...arguments)
	}

	onMounted(() => {
		console.log(run)
	})

	return {
		ins, conflicts, run, formatWord
	}
},

}).mount('#form')


// TODO only store if not the default example
var stored = window.localStorage['ins']
if (stored)
	ins.value = stored
else
	ins.value = sampleInputs.nch_rch

function myrun(e) {
	// Set up replacement rules, etc.
	processInput()

	// Apply replacement rules
	return applyReplacements()
}

function processInput() {
	// Save current textarea to localStorage
	window.localStorage['ins'] = ins.value

	var lines = ins.value.trim('\n').split('\n')

	processLines(lines)
}

function processLines(lines) {
	window.transformers = { mappers: [], reducers: [], combiners: [] }

	for (line of lines) {
		let [command, target, criterion] = line.match(/^(\S+) +(\S+) +(.*)$/).slice(1)
		let flag = true
		let key
		let type
		let transformer

		switch (target) {
			case 'word':
			case 'orth':
			case 'graph':
			case 'w':
				key = 'word'
				break
			case 'pron':
			case 'p':
			case 'ipa':
				key = 'pron'
				break
		}

		switch (command) {
			// Implement basic comments
			case '#':
			case '//':
			case '%':
				break

			// First phase (map)
			// These functions can transform `word` or `pron`

			case 'match':
			case 'replace':
				type = 'mappers'
				// var [regexStr, replacement] = criterion.match('^(.*) -> (.*)$').slice(1)
				let [regexStr, replacement] = criterion.split(' -> ')
				let regex = RegExp(regexStr, 'g')
				let okey = key

				transformer = (() => function replaceTransformer(entry) {
					if (entry[okey].match(regex)) {
						arguments.callee.accepted ++
						entry[okey] = entry[okey].replace(regex, replacement)
					}
					else {
						arguments.callee.rejected ++
					}
					return entry
				})()
				break

			// Second phase (reduce)
			// These functions can eliminate candidates

			case 'freq':
			case 'frequency':
				type = 'reducers'
				var threshold
				if (criterion.match(/^\d+$/))
					threshold = parseInt(criterion)
				else
					threshold = parseFloat(criterion) * total
				if (isNaN(threshold))
					throw `Unable to parse ${criterion} as number (int or float)`

				transformer = (() => function frequencyTransformer(entry) {
					var {originalword} = entry
					// ignore `target` and always choose `word`
					var debug = `freq of ${originalword}: ${freq[originalword]}; threshold: ${threshold}`
					if (originalword in freq && freq[originalword] > threshold) {
						arguments.callee.accepted ++
						return entry
					}
					else {
						arguments.callee.rejected ++
					}
					throw debug
				})()
				break

			case 'reject':
				flag = false
			case 'accept':
			case 'win':
				type = 'reducers'
				var win = RegExp(criterion)

				transformer = (() => function acceptTransformer(entry) {
					if (!!(entry[key].match(win)) === flag) {
						arguments.callee.accepted ++
						return entry
					}
					else {
						arguments.callee.rejected ++
					}
				})()
				break

			// Third phase (combine)

			case 'group':
				type = 'combiners'
				transformer = (() => function groupTransformer(entries) {
					return entries.map(
						(bin) => [bin[0], bin[1].groupBy((match) => match['originalpron'])]
					)
				})()
				break

			case 'sort':
			case 'min1':
				type = 'combiners'
				var minimum = parseInt(criterion)

				transformer = (() => function minTransformer(entries) {
					let tmp = arguments.callee
					return entries.filter(([pron, bin]) => bin.length >= minimum)
				})()
				break

			default:
				continue
		}
		transformer.params = [target, criterion]
		transformer.accepted = transformer.rejected = 0
		transformers[type].push(transformer)
	}

	return transformers
}

function transformEntry(transformers, accumulator) {
	for (var transformer of transformers) {
		accumulator = transformer(accumulator)
		if (!accumulator) {
			// transformer.rejected ++
			return
		}
		else {
			// transformer.accepted ++
		}
	}
	return accumulator
}

function applyReplacements() {
	var matches = {}
	for (var [originalword, entries] of Object.entries(dict)) {
		var i = 0
		for (var originalpron of entries) {
			var entry = {
				originalword,
				word: originalword,
				originalpron,
				pron: originalpron
			}, mapped
			i ++
			try {
				mapped = transformEntry(window.transformers.mappers, entry)
			}
			catch (e) {
				continue
			}
			if (!mapped) {
				continue
			}

			var { word: transformedWord, pron: transformedPron } = mapped
			try {
				reduced = transformEntry(window.transformers.reducers, mapped)
			}
			catch (e) {
				continue
			}
			if (!reduced) {
				continue
			}

			// If reached here, successful match!
			// Add it to the dict of matches.

			var match = {
				'word': originalword,
				'subscript': (entries.length > 1) ? i : '',
				'originalpron': originalpron
			}

			if (!(transformedPron in matches)) {
				matches[transformedPron] = []
			}
			matches[transformedPron].push(match)
			// choose which to group

			// console.log(i++, head, entry, replace(entry))
			// if (regex.test(entry)) {

			// 	[head, entry]
			// 	console.log(regex, head, entry)
			// }
		}
	}

	// Extract conflicts only
	conflicts = transformEntry(window.transformers.combiners, Object.entries(matches))

	return conflicts

	// var dl = document.createElement('dl')
	// for (var [transformedPron, bin] of conflicts) {
	// 	var dt = document.createElement('dt')
	// 	dt.innerHTML = `<cite>${transformedPron}</cite>`
	// 	dl.appendChild(dt)
	// 	var dd = document.createElement('dd')
	// 	dl.appendChild(dd)
	// 	var i=0
	// 	var dl1 = document.createElement('dl')
	// 	for (var [originalpron, group] of Object.entries(bin)) {
	// 		var dt1 = document.createElement('dt')
	// 		dt1.innerHTML = `<cite>${originalpron}</cite>`
	// 		dl1.appendChild(dt1)
	// 		var dd1 = document.createElement('dd')
	// 		dl1.appendChild(dd1)
	// 		var dl2 = document.createElement('dl')

	// 		for (var match of group) {
	// 			var {word, originalpron, subscript} = match
	// 			var dt2 = document.createElement('dt')
	// 			var dd2 = document.createElement('dd')
	// 			dt2.innerHTML = formatWord(word, subscript)
	// 			dd2.innerHTML = `<cite>/${originalpron}/</cite>`
	// 			dl2.appendChild(dt2)
	// 			dl2.appendChild(dd2)
	// 		}
	// 		dd1.appendChild(dl2)
	// 	}
	// 	dd.appendChild(dl1)
	// }

	// out.replaceChildren(dl)

	for (var transformer of Object.values(transformers).flat()) {
		var p = document.createElement('p')
		if (!transformer.params)
			transformer.params = []
		p.innerText = `${transformer.name} ${transformer.params.join(' ')}
		accepted ${transformer.accepted} and rejected ${transformer.rejected}`
		out.appendChild(p)
	}
}

total = 145049693
function myformatWord({word}) {
	var freq1 = freq[word] || 0
	var prop = (freq1 || 1) / total
	var log = -Math.log10(prop)
	var gray = .2 * log - .8
	var hsl = `hsl(0,0%,${100*gray}%)`

	if      (log < 5)   weight = 9 // Black
	else if (log < 5.5) weight = 7 // Bold
	else if (log < 6)   weight = 6 // Medium
	else if (log < 6.5) weight = 5 // Regular
	else                weight = 4 // Book

	return {
		style: { 'color': hsl, 'font-weight': `${weight}00` },
		log, freq1
	}
}

// window.onload = () => {
// 	if (ins.value)
// 		run()
// }
// document.getElementById('but').onclick = run
