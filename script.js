const { createApp, reactive, ref, computed, onMounted } = Vue
const app = createApp({
setup() {
	const ins          = ref(populateIns())
	const lines        = computed(processIns)
	const transformers = computed(processLines)
	const conflicts    = computed(applyTransformers)
	// const conflicts = ref({})

	function populateIns() {
		// TODO only store if not the default example
		var stored = window.localStorage['ins']
		if (stored)
			return stored
		else
			return sampleInputs.nch_rch
	}
/*
	function myrun(e) {
		performance.mark('Start')

		// Set up transformer functions for replacement rules, etc.
		processInput()
		performance.mark('After processInput')

		processLines()

		// Apply transformers
		applyTransformers()
		performance.mark('After applyTransformers')

	}*/

	function processIns() {
		// Save current textarea to localStorage
		window.localStorage['ins'] = ins.value

		return ins.value.trim('\n').split('\n')
	}

	function processLines() {
		let transformers = { mapper: [], reducer: [], combiner: [] }

		for (line of lines.value) {
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
					type = 'mapper'
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
					type = 'reducer'
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
					type = 'reducer'
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
					type = 'combiner'
					transformer = (() => function groupTransformer(entries) {
						return entries.map(
							(bin) => [bin[0], bin[1].groupBy((match) => match['originalpron'])]
						)
					})()
					break

				case 'sort':
				case 'min1':
					type = 'combiner'
					var minimum = parseInt(criterion)

					transformer = (() => function minTransformer(entries) {
						let tmp = arguments.callee
						return entries.filter(([pron, bin]) => {
							if (bin.length >= minimum)
								return tmp.accepted ++, true
							else
								return tmp.rejected ++, false
						})
					})()
					break

				default:
					continue
			}

			transformer.line = line
			transformer.command = command
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

	function applyTransformers() {
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
					mapped = transformEntry(transformers.value.mapper, entry)
				}
				catch (e) {
					continue
				}
				if (!mapped) {
					continue
				}

				var { word: transformedWord, pron: transformedPron } = mapped
				try {
					reduced = transformEntry(transformers.value.reducer, mapped)
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
		let conflicts = transformEntry(transformers.value.combiner, Object.entries(matches))

		return conflicts
	}



	function run() {
		// ins.value
	}
	function formatWord() {
		return myformatWord(...arguments)
	}

	onMounted(() => {
		console.log(run)
		// populateIns()
	})

	return {
		ins, lines, conflicts, transformers,
		run, formatWord
	}
}
})
window.onload = () => app.mount('#form')



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
